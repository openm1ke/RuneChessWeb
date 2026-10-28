// The VK build keeps progress in VK Storage, whose limits shape everything
// here: keys of [a-zA-Z_\-0-9] only, values cut at a few thousand
// characters, no delete. And VK's ad rules (5.1.5): rewarded only on the
// player's request, the reward only for a video watched to the end.
import { describe, expect, it, vi } from 'vitest';
import { type AnalyticsService } from '../services/analyticsService';
import { chooseSave, decodeFromVk, encodeForVk, mayShowInterstitialNow, vkKey } from '../services/vkPlatform';
import { type VkAdsBridge, VkRewardedAdsService } from '../services/vkRewardedAdsService';
import { PROGRESS_STORAGE_KEYS } from '../services/progressRepository';
import { LANGUAGE_STORAGE_KEY } from '../services/languageRepository';

/** Reads back what [encodeForVk] wrote, the way VK would hand it over. */
function roundTrip(key: string, value: string | null): string | null {
  const stored = new Map(encodeForVk(key, value));
  return decodeFromVk(stored.get(vkKey(key)), (i) => stored.get(`${vkKey(key)}-${i}`));
}

describe('VK Storage encoding', () => {
  it('every key the game keeps is a key VK accepts', () => {
    for (const key of [...PROGRESS_STORAGE_KEYS, LANGUAGE_STORAGE_KEY]) {
      expect(vkKey(key)).toMatch(/^[a-zA-Z0-9_-]{1,90}$/);
    }
    expect(new Set(PROGRESS_STORAGE_KEYS.map(vkKey)).size).toBe(PROGRESS_STORAGE_KEYS.length);
  });

  it('keeps short values, empty ones and removals apart', () => {
    expect(roundTrip('dozor.music_volume', '0.4')).toBe('0.4');
    expect(roundTrip('dozor.unlocked_level_indexes', '')).toBe('');
    expect(roundTrip('dozor.unlocked_level_indexes', null)).toBeNull();
  });

  it('splits a long value into parts VK will keep whole', () => {
    const history = JSON.stringify(Array.from({ length: 400 }, (_, i) => ({ d: `2026-01-${i}`, s: 3, м: 'ход' })));
    const writes = encodeForVk('dozor.daily_challenge_history_v1', history);
    expect(writes.length).toBeGreaterThan(2);
    for (const [key, value] of writes) {
      expect(key).toMatch(/^[a-zA-Z0-9_-]{1,100}$/);
      expect(new TextEncoder().encode(value).length).toBeLessThanOrEqual(4096);
    }
    expect(roundTrip('dozor.daily_challenge_history_v1', history)).toBe(history);
  });

  it('a value with a part missing reads as no value, not half of one', () => {
    const stored = new Map(encodeForVk('dozor.level_stars_v1', 'x'.repeat(5000)));
    stored.delete('dozor-level_stars_v1-1');
    expect(decodeFromVk(stored.get('dozor-level_stars_v1'), (i) => stored.get(`dozor-level_stars_v1-${i}`))).toBeNull();
  });
});

describe('which save wins at launch', () => {
  const cloud = new Map([['dozor.music_volume', '0.2'], ['runechess.vk_saved_at', '2000']]);

  it('the cloud, normally', () => {
    const local = new Map([['dozor.music_volume', '0.9'], ['runechess.vk_saved_at', '1000']]);
    expect(chooseSave(cloud, local)).toBe(cloud);
  });

  it('this device, when it saved later — progress made offline', () => {
    const local = new Map([['dozor.music_volume', '0.9'], ['runechess.vk_saved_at', '3000']]);
    expect(chooseSave(cloud, local)).toBe(local);
  });

  it('this device, on the first launch inside VK', () => {
    const local = new Map([['dozor.music_volume', '0.9']]);
    expect(chooseSave(new Map(), local)).toBe(local);
  });
});

describe('the interstitial between levels', () => {
  it('never at launch (5.1.5.2)', () => {
    expect(mayShowInterstitialNow(Date.now())).toBe(false);
    expect(mayShowInterstitialNow(Date.now() + 61_000)).toBe(true);
  });
});

function analyticsSpy(): AnalyticsService {
  return {
    adRequested: vi.fn(),
    adShown: vi.fn(),
    adRewarded: vi.fn(),
    adClosedWithoutReward: vi.fn(),
    adShowFailed: vi.fn(),
    adUnavailable: vi.fn(),
  } as unknown as AnalyticsService;
}

function fakeVk(available: boolean, watched: boolean | Error): VkAdsBridge {
  return {
    send: vi.fn((method: string) => {
      if (method === 'VKWebAppCheckNativeAds') return Promise.resolve({ result: available });
      return watched instanceof Error ? Promise.reject(watched) : Promise.resolve({ result: watched });
    }),
  } as unknown as VkAdsBridge;
}

describe('VkRewardedAdsService', () => {
  it('rewards a video watched to the end', async () => {
    const analytics = analyticsSpy();
    const service = new VkRewardedAdsService(analytics, fakeVk(true, true));
    await service.show('extraHint');
    expect(service.stateOf('extraHint')).toBe('rewarded');
    expect(analytics.adRewarded).toHaveBeenCalledWith('extra_hint');
  });

  it('a video closed early grants nothing', async () => {
    const analytics = analyticsSpy();
    const service = new VkRewardedAdsService(analytics, fakeVk(true, false));
    await service.show('bonusStar');
    expect(service.stateOf('bonusStar')).toBe('closedWithoutReward');
    expect(analytics.adRewarded).not.toHaveBeenCalled();
  });

  it('says so when VK has nothing to show, without trying', async () => {
    const vk = fakeVk(false, true);
    const service = new VkRewardedAdsService(analyticsSpy(), vk);
    await service.show('skipLevel');
    expect(service.stateOf('skipLevel')).toBe('unavailable');
    expect(vk.send).not.toHaveBeenCalledWith('VKWebAppShowNativeAds', expect.anything());
  });

  it('a failed show ends the attempt instead of leaving the button busy', async () => {
    const analytics = analyticsSpy();
    const service = new VkRewardedAdsService(analytics, fakeVk(true, new Error('no_ads')));
    await service.show('dailyDouble');
    expect(service.stateOf('dailyDouble')).toBe('error');
    expect(analytics.adShowFailed).toHaveBeenCalledWith('daily_double', 'no_ads');
  });
});
