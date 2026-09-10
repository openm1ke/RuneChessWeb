import { AnalyticsService } from './analyticsService';
import type {
  AdPlacement,
  RewardedAdListener,
  RewardedAdState,
  RewardedAds,
} from './rewardedAdsService';
import { analyticsName } from './rewardedAdsService';
import type { YandexGamesSdk } from './yandexGamesSdk';

/**
 * Rewarded ads as the Yandex Games catalogue serves them.
 *
 * The site's [RewardedAdsService] asks РСЯ for a specific block registered
 * to runechess.ru; inside the platform's iframe that block is not allowed
 * and nothing is shown. Here there is no block at all — `ysdk.adv` serves
 * the platform's own inventory, test creatives before publication and real
 * ones after, and the money arrives through the Games contract rather than
 * through our РСЯ account.
 *
 * The differences from the РСЯ backend that shape this class:
 *
 *  - `showRewardedVideo` returns nothing and reports through callbacks, so
 *    the promise this exposes is settled by whichever callback lands first.
 *  - `onRewarded` carries no boolean: it fires only when the reward is
 *    earned. A close without it is a close without a reward.
 *  - `onError` can fire *after* `onOpen`, so a settled attempt must not be
 *    overwritten — the same lesson the РСЯ backend learned from a
 *    synchronous WRONG_DOMAIN answer leaving the button stuck.
 *
 * Analytics names are deliberately the same as the site's, so the funnels
 * already built in Metrica cover both surfaces without a second set.
 */
export class YandexGamesRewardedAdsService implements RewardedAds {
  constructor(
    private readonly sdk: YandexGamesSdk,
    private readonly analytics: AnalyticsService,
  ) {}

  private readonly lastState: Record<AdPlacement, RewardedAdState> = {
    extraHint: 'idle',
    bonusStar: 'idle',
    skipLevel: 'idle',
    dailyDouble: 'idle',
  };
  private readonly showInFlight: Record<AdPlacement, boolean> = {
    extraHint: false,
    bonusStar: false,
    skipLevel: false,
    dailyDouble: false,
  };
  private readonly listeners = new Set<RewardedAdListener>();

  stateOf(placement: AdPlacement): RewardedAdState {
    return this.lastState[placement];
  }

  addListener(listener: RewardedAdListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(placement: AdPlacement, state: RewardedAdState): void {
    this.lastState[placement] = state;
    for (const listener of this.listeners) listener(placement, state);
  }

  async show(placement: AdPlacement): Promise<void> {
    if (this.showInFlight[placement]) return;
    this.showInFlight[placement] = true;
    const name = analyticsName(placement);
    try {
      this.analytics.adRequested(name);
      this.emit(placement, 'loading');
      await new Promise<void>((resolve) => {
        let settled = false;
        let rewarded = false;
        const settle = (state: RewardedAdState, report: () => void) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          this.emit(placement, state);
          report();
          resolve();
        };
        // The platform can leave a call unanswered — a blocked iframe, a
        // dropped connection — and a caller waiting forever is a disabled
        // button that never comes back. Same guard, same 15 seconds as the
        // site's backend.
        const timeout = window.setTimeout(() => {
          settle('error', () => this.analytics.adShowFailed(name, 'sdk_timeout'));
        }, 15_000);
        try {
          this.sdk.adv.showRewardedVideo({
            callbacks: {
              onOpen: () => {
                if (settled) return;
                this.emit(placement, 'showing');
                this.analytics.adShown(name);
              },
              onRewarded: () => {
                rewarded = true;
              },
              onClose: () => {
                settle(
                  rewarded ? 'rewarded' : 'closedWithoutReward',
                  () => rewarded
                    ? this.analytics.adRewarded(name)
                    : this.analytics.adClosedWithoutReward(name),
                );
              },
              onError: (error) => {
                settle('error', () =>
                  this.analytics.adShowFailed(name, describe(error)),
                );
              },
            },
          });
        } catch (error) {
          settle('error', () => this.analytics.adShowFailed(name, describe(error)));
        }
      });
    } finally {
      this.showInFlight[placement] = false;
    }
  }
}

/** The SDK is loose about what it hands `onError`; analytics wants a short
 * string it can group by. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const value = record.message ?? record.code;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return 'sdk_error';
}
