// The ads backend the game uses inside the games.yandex.ru catalogue.
//
// Its shape is dictated by the platform SDK, which differs from РСЯ in ways
// that are easy to get wrong and invisible until money is missing:
// `onRewarded` carries no boolean and fires only on success, the reward
// arrives *before* the close, and an error can still land after the video
// opened. Each of those is a test below.
import { describe, expect, it, vi } from 'vitest';
import { type AnalyticsService } from '../services/analyticsService';
import { YandexGamesRewardedAdsService } from '../services/yandexGamesRewardedAdsService';
import type { YandexGamesSdk } from '../services/yandexGamesSdk';

type Callbacks = {
  onOpen?: () => void;
  onRewarded?: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
};

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

/** An SDK whose video is driven by the test rather than by a player. */
function fakeSdk(drive: (callbacks: Callbacks) => void): YandexGamesSdk {
  return {
    features: {
      LoadingAPI: { ready: vi.fn() },
      GameplayAPI: { start: vi.fn(), stop: vi.fn() },
    },
    environment: { app: { id: '12345' }, i18n: { lang: 'ru' } },
    on: vi.fn(),
    off: vi.fn(),
    adv: {
      showRewardedVideo: ({ callbacks }: { callbacks?: Callbacks }) => {
        drive(callbacks ?? {});
      },
    },
  } as unknown as YandexGamesSdk;
}

describe('YandexGamesRewardedAdsService', () => {
  it('rewards a watched video', async () => {
    const analytics = analyticsSpy();
    const service = new YandexGamesRewardedAdsService(
      // The platform's order: the reward lands before the close.
      fakeSdk((cb) => {
        cb.onOpen?.();
        cb.onRewarded?.();
        cb.onClose?.();
      }),
      analytics,
    );

    await service.show('extraHint');

    expect(service.stateOf('extraHint')).toBe('rewarded');
    expect(analytics.adShown).toHaveBeenCalledWith('extra_hint');
    expect(analytics.adRewarded).toHaveBeenCalledWith('extra_hint');
    expect(analytics.adClosedWithoutReward).not.toHaveBeenCalled();
  });

  it('a video closed early earns nothing', async () => {
    const analytics = analyticsSpy();
    const service = new YandexGamesRewardedAdsService(
      fakeSdk((cb) => {
        cb.onOpen?.();
        cb.onClose?.();
      }),
      analytics,
    );

    await service.show('bonusStar');

    expect(service.stateOf('bonusStar')).toBe('closedWithoutReward');
    expect(analytics.adRewarded).not.toHaveBeenCalled();
    expect(analytics.adClosedWithoutReward).toHaveBeenCalledWith('bonus_star');
  });

  it('an error after the video opened is still an error', async () => {
    const analytics = analyticsSpy();
    const service = new YandexGamesRewardedAdsService(
      fakeSdk((cb) => {
        cb.onOpen?.();
        cb.onError?.({ message: 'no fill' });
      }),
      analytics,
    );

    await service.show('skipLevel');

    expect(service.stateOf('skipLevel')).toBe('error');
    expect(analytics.adShowFailed).toHaveBeenCalledWith('skip_level', 'no fill');
  });

  it('a second tap while a video is running is ignored', async () => {
    const analytics = analyticsSpy();
    const show = vi.fn();
    const sdk = fakeSdk(() => {});
    (sdk as unknown as { adv: { showRewardedVideo: unknown } }).adv.showRewardedVideo = show;
    const service = new YandexGamesRewardedAdsService(sdk, analytics);

    void service.show('dailyDouble');
    void service.show('dailyDouble');

    expect(show).toHaveBeenCalledTimes(1);
  });

  it('reports the placement names the site already uses', async () => {
    const analytics = analyticsSpy();
    const service = new YandexGamesRewardedAdsService(
      fakeSdk((cb) => {
        cb.onRewarded?.();
        cb.onClose?.();
      }),
      analytics,
    );

    await service.show('dailyDouble');

    // Same event names as RewardedAdsService, so one Metrica funnel covers
    // the site and the catalogue instead of two.
    expect(analytics.adRequested).toHaveBeenCalledWith('daily_double');
    expect(analytics.adRewarded).toHaveBeenCalledWith('daily_double');
  });
});
