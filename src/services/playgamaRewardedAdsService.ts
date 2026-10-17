import { AnalyticsService } from './analyticsService';
import type { PlaygamaBridge } from './playgamaPlatform';
import type {
  AdPlacement,
  RewardedAdListener,
  RewardedAdState,
  RewardedAds,
} from './rewardedAdsService';
import { analyticsName } from './rewardedAdsService';

/**
 * Rewarded ads through Playgama Bridge.
 *
 * Unlike the other two backends, Bridge has no per-call callbacks: one
 * `showRewarded()` at a time, and the outcome arrives as a stream of
 * `REWARDED_STATE_CHANGED` events — `loading`, `opened`, `rewarded`,
 * `closed`, or `failed`. So this listens once, for the whole session, and
 * routes each event to whichever placement asked last.
 *
 * `rewarded` comes before `closed`, and only when the reward is earned; a
 * `closed` without it is a close without a reward — the same shape as the
 * Yandex Games SDK, and the same analytics names as the site, so one set of
 * funnels covers every surface.
 */
export class PlaygamaRewardedAdsService implements RewardedAds {
  constructor(
    private readonly bridge: PlaygamaBridge,
    private readonly analytics: AnalyticsService,
  ) {
    bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, (state) => this.onState(state));
  }

  private readonly lastState: Record<AdPlacement, RewardedAdState> = {
    extraHint: 'idle',
    bonusStar: 'idle',
    skipLevel: 'idle',
    dailyDouble: 'idle',
  };
  private readonly listeners = new Set<RewardedAdListener>();

  /** The attempt in flight, if any: Bridge shows one rewarded ad at a time. */
  private attempt: {
    placement: AdPlacement;
    rewarded: boolean;
    finish: () => void;
    timeout: number;
  } | null = null;

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

  show(placement: AdPlacement): Promise<void> {
    if (this.attempt) return Promise.resolve();
    const name = analyticsName(placement);
    if (!this.bridge.advertisement.isRewardedSupported) {
      this.emit(placement, 'unavailable');
      this.analytics.adShowFailed(name, 'unsupported');
      return Promise.resolve();
    }
    this.analytics.adRequested(name);
    this.emit(placement, 'loading');
    return new Promise<void>((resolve) => {
      this.attempt = {
        placement,
        rewarded: false,
        finish: resolve,
        // Same guard as the other backends: a platform that never answers
        // must not leave the button disabled for good.
        timeout: window.setTimeout(() => this.settle('error', 'sdk_timeout'), 15_000),
      };
      try {
        this.bridge.advertisement.showRewarded(placement);
      } catch (error) {
        this.settle('error', error instanceof Error ? error.message : 'sdk_error');
      }
    });
  }

  private onState(state: string): void {
    const attempt = this.attempt;
    if (!attempt) return;
    const name = analyticsName(attempt.placement);
    switch (state) {
      case 'opened':
        this.emit(attempt.placement, 'showing');
        this.analytics.adShown(name);
        break;
      case 'rewarded':
        attempt.rewarded = true;
        break;
      case 'closed':
        this.settle(attempt.rewarded ? 'rewarded' : 'closedWithoutReward');
        break;
      case 'failed':
        this.settle('error', 'failed');
        break;
    }
  }

  private settle(state: RewardedAdState, failure?: string): void {
    const attempt = this.attempt;
    if (!attempt) return;
    this.attempt = null;
    window.clearTimeout(attempt.timeout);
    this.emit(attempt.placement, state);
    const name = analyticsName(attempt.placement);
    if (state === 'rewarded') this.analytics.adRewarded(name);
    else if (state === 'closedWithoutReward') this.analytics.adClosedWithoutReward(name);
    else this.analytics.adShowFailed(name, failure ?? 'sdk_error');
    attempt.finish();
  }
}
