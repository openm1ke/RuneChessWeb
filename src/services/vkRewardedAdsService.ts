import { AnalyticsService } from './analyticsService';
import type {
  AdPlacement,
  RewardedAdListener,
  RewardedAdState,
  RewardedAds,
} from './rewardedAdsService';
import { analyticsName } from './rewardedAdsService';
import { noteVkAdShown, vkBridge } from './vkPlatform';

/** The part of VK Bridge this backend uses — a seam for the tests. */
export interface VkAdsBridge {
  send(method: 'VKWebAppCheckNativeAds', props: { ad_format: 'reward' }): Promise<{ result: boolean }>;
  send(method: 'VKWebAppShowNativeAds', props: { ad_format: 'reward' }): Promise<{ result: boolean }>;
}

/**
 * Rewarded ads through VK Bridge — the only network rule 5.1.2 allows in
 * the catalogue.
 *
 * `VKWebAppShowNativeAds` is one call that answers once: `result: true`
 * when the video was watched to its reward, `false` when it was closed
 * early, a rejection when nothing could be shown. Asking
 * `VKWebAppCheckNativeAds` first both tells whether there is anything to
 * show and has VK load it, so the offer card can say "no video" instead
 * of hanging.
 *
 * Rule 5.1.5.1: a rewarded ad only on the player's own request, for a
 * reward named before it — which is every placement here.
 */
export class VkRewardedAdsService implements RewardedAds {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly vk: VkAdsBridge = vkBridge() as unknown as VkAdsBridge,
  ) {}

  private readonly lastState: Record<AdPlacement, RewardedAdState> = {
    extraHint: 'idle',
    bonusStar: 'idle',
    skipLevel: 'idle',
    dailyDouble: 'idle',
  };
  private readonly listeners = new Set<RewardedAdListener>();
  /** One ad at a time, whichever placement asked. */
  private inFlight = false;

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
    if (this.inFlight) return;
    this.inFlight = true;
    const name = analyticsName(placement);
    try {
      this.analytics.adRequested(name);
      this.emit(placement, 'loading');
      const available = await withTimeout(this.vk.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }));
      if (!available.result) {
        this.emit(placement, 'unavailable');
        this.analytics.adUnavailable(name);
        return;
      }
      this.emit(placement, 'showing');
      this.analytics.adShown(name);
      // No timeout here: the promise is open for as long as the player
      // watches, and a 30-second video must not be cut off as a failure.
      const answer = await this.vk.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
      noteVkAdShown();
      if (answer.result) {
        this.emit(placement, 'rewarded');
        this.analytics.adRewarded(name);
      } else {
        this.emit(placement, 'closedWithoutReward');
        this.analytics.adClosedWithoutReward(name);
      }
    } catch (error) {
      this.emit(placement, 'error');
      this.analytics.adShowFailed(name, describe(error));
    } finally {
      this.inFlight = false;
      // Have the next one loaded before it is asked for.
      void this.vk.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }).catch(() => {});
    }
  }
}

/** A check that never answers must not leave the button busy for good. */
function withTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('sdk_timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Bridge rejects with `{ error_type, error_data }`; analytics wants a
 * short string it can group by. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const record = error as { error_type?: unknown; error_data?: { error_reason?: unknown; error_code?: unknown } };
    const reason = record.error_data?.error_reason ?? record.error_data?.error_code ?? record.error_type;
    if (typeof reason === 'string' || typeof reason === 'number') return String(reason);
  }
  return 'sdk_error';
}
