import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AnalyticsService } from '../services/analyticsService';
import {
  RewardedAdsService,
  type RewardedBlockIds,
} from '../services/rewardedAdsService';

type RenderOptions = {
  blockId: string;
  platform?: 'desktop' | 'touch';
  onRewarded?: (isRewarded: boolean) => void;
  onClose?: () => void;
  onError?: (error: { code?: string | number; message?: string }) => void;
};

const blockIds: RewardedBlockIds = { desktop: 'desktop-unit', touch: 'touch-unit' };

function analyticsSpy(): AnalyticsService {
  return {
    adRequested: vi.fn(),
    adShown: vi.fn(),
    adRewarded: vi.fn(),
    adClosedWithoutReward: vi.fn(),
    adUnavailable: vi.fn(),
    adShowFailed: vi.fn(),
  } as unknown as AnalyticsService;
}

describe('RewardedAdsService', () => {
  beforeEach(() => {
    window.yaContextCb = [];
    delete window.Ya;
    document.querySelectorAll('script[src="https://yandex.ru/ads/system/context.js"]').forEach((node) => node.remove());
  });

  it('uses the touch block and grants a hint only after the confirmed reward callback', async () => {
    const analytics = analyticsSpy();
    let options: RenderOptions | undefined;
    window.Ya = {
      Context: {
        AdvManager: {
          getPlatform: () => 'touch',
          // The documented API is allowed to return void — it must not be
          // treated as a Promise by the caller.
          render: (received: RenderOptions) => {
            options = received;
          },
        },
      },
    };
    const ads = new RewardedAdsService(analytics, blockIds);

    const show = ads.show('extraHint');
    window.yaContextCb?.at(-1)?.();

    expect(options).toMatchObject({ blockId: 'touch-unit', type: 'rewarded', platform: 'touch' });
    expect(ads.stateOf('extraHint')).toBe('showing');
    expect(analytics.adRewarded).not.toHaveBeenCalled();

    options?.onRewarded?.(true);
    await show;

    expect(ads.stateOf('extraHint')).toBe('rewarded');
    expect(analytics.adRequested).toHaveBeenCalledWith('extra_hint');
    expect(analytics.adShown).toHaveBeenCalledWith('extra_hint');
    expect(analytics.adRewarded).toHaveBeenCalledWith('extra_hint');
  });

  it('does not issue a reward when the desktop ad closes early', async () => {
    const analytics = analyticsSpy();
    let options: RenderOptions | undefined;
    window.Ya = {
      Context: {
        AdvManager: {
          getPlatform: () => 'desktop',
          render: (received: RenderOptions) => {
            options = received;
          },
        },
      },
    };
    const ads = new RewardedAdsService(analytics, blockIds);

    const show = ads.show('bonusStar');
    window.yaContextCb?.at(-1)?.();
    expect(options?.blockId).toBe('desktop-unit');

    options?.onClose?.();
    await show;

    expect(ads.stateOf('bonusStar')).toBe('closedWithoutReward');
    expect(analytics.adRewarded).not.toHaveBeenCalled();
    expect(analytics.adClosedWithoutReward).toHaveBeenCalledWith('bonus_star');
  });
});
