import { AnalyticsService } from './analyticsService';

/** Yandex Advertising Network (РСЯ) Rewarded integration for runechess.ru. */

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context: {
        AdvManager: {
          /** The production API may return either void or a Promise. */
          render: (options: YandexAdvManagerRenderOptions) => void | Promise<unknown>;
          getPlatform?: () => 'desktop' | 'touch';
        };
      };
    };
  }
}

interface YandexAdvManagerRenderOptions {
  blockId: string;
  type: 'rewarded';
  platform?: 'desktop' | 'touch';
  onRewarded?: (isRewarded: boolean) => void;
  onError?: (error: { code?: string | number; message?: string }) => void;
  onClose?: () => void;
}

type YandexAdvManager = NonNullable<Window['Ya']>['Context']['AdvManager'];

export type AdPlacement = 'extraHint' | 'bonusStar' | 'skipLevel';

const ANALYTICS_NAME: Record<AdPlacement, string> = {
  extraHint: 'extra_hint',
  bonusStar: 'bonus_star',
  skipLevel: 'skip_level',
};

function analyticsName(placement: AdPlacement): string {
  return ANALYTICS_NAME[placement];
}

export interface RewardedBlockIds {
  desktop: string;
  touch: string;
}

/** The Rewarded blocks РСЯ approved for runechess.ru — desktop and mobile
 * versions of the site. The reward differs by player intent, while the
 * platform-specific ad block is shared. */
export const RSYA_REWARDED_BLOCK_IDS: RewardedBlockIds = {
  desktop: 'R-A-19847196-2',
  touch: 'R-A-19847196-1',
};

export type RewardedAdState =
  | 'idle'
  | 'loading'
  | 'showing'
  | 'rewarded'
  | 'closedWithoutReward'
  | 'unavailable'
  | 'error';

export type RewardedAdListener = (placement: AdPlacement, state: RewardedAdState) => void;

const LOADER_SRC = 'https://yandex.ru/ads/system/context.js';

function ensureLoaderScript(): void {
  if (typeof window === 'undefined') return;
  window.yaContextCb = window.yaContextCb || [];
  if (document.querySelector(`script[src="${LOADER_SRC}"]`)) return;
  const script = document.createElement('script');
  script.src = LOADER_SRC;
  script.async = true;
  document.head.appendChild(script);
}

function platformFor(manager: YandexAdvManager): 'desktop' | 'touch' {
  const reported = manager.getPlatform?.();
  if (reported === 'desktop' || reported === 'touch') return reported;
  return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768
    ? 'touch'
    : 'desktop';
}

/**
 * Mirrors `RewardedAdsService` in the Flutter app: one instance owns both
 * placements (`extraHint`, `bonusStar`, `skipLevel`); each is shown independently.
 * Unlike the mobile SDK, `Ya.Context.AdvManager.render()` both loads *and*
 * shows a rewarded unit in one call — there is no separate preload step —
 * so [show] is the only entry point here.
 */
export class RewardedAdsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly blockIds: RewardedBlockIds = RSYA_REWARDED_BLOCK_IDS,
  ) {
    ensureLoaderScript();
  }

  private readonly lastState: Record<AdPlacement, RewardedAdState> = {
    extraHint: 'idle',
    bonusStar: 'idle',
    skipLevel: 'idle',
  };
  private readonly showInFlight: Record<AdPlacement, boolean> = {
    extraHint: false,
    bonusStar: false,
    skipLevel: false,
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

  /** Requests and shows a rewarded unit for `placement`. Resolves once the
   * attempt is fully settled (rewarded, closed without reward, or failed);
   * callers react to state changes via [addListener]/[stateOf], not this
   * promise's return value. Guarded against a double-tap starting two
   * concurrent shows for the same placement, exactly like the mobile
   * service's `_showInFlight`. */
  async show(placement: AdPlacement): Promise<void> {
    if (this.showInFlight[placement]) return;
    this.showInFlight[placement] = true;
    const name = analyticsName(placement);
    try {
      this.analytics.adRequested(name);
      if (typeof window === 'undefined' || !window.yaContextCb) {
        this.emit(placement, 'unavailable');
        this.analytics.adUnavailable(name);
        return;
      }

      this.emit(placement, 'loading');
      await new Promise<void>((resolve) => {
        let settled = false;
        const settle = (state: RewardedAdState, report: () => void) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          this.emit(placement, state);
          report();
          resolve();
        };
        // An ad blocker or an interrupted connection can prevent the loader
        // from draining its queue. Recover instead of leaving a CTA disabled
        // forever; the player may try again later.
        const timeout = window.setTimeout(() => {
          settle('error', () => this.analytics.adShowFailed(name, 'loader_timeout'));
        }, 15_000);
        const render = () => {
          if (settled) return;
          if (!window.Ya) {
            settle('unavailable', () => this.analytics.adUnavailable(name));
            return;
          }
          const manager = window.Ya.Context.AdvManager;
          const platform = platformFor(manager);
          let rewarded = false;
          try {
            const result = manager.render({
              blockId: this.blockIds[platform],
              type: 'rewarded',
              platform,
              onRewarded: (isRewarded) => {
                rewarded = isRewarded;
                settle(
                  isRewarded ? 'rewarded' : 'closedWithoutReward',
                  () => isRewarded
                    ? this.analytics.adRewarded(name)
                    : this.analytics.adClosedWithoutReward(name),
                );
              },
              onClose: () => {
                if (!rewarded) {
                  settle('closedWithoutReward', () => this.analytics.adClosedWithoutReward(name));
                }
              },
              onError: (error) => {
                settle('error', () =>
                  this.analytics.adShowFailed(name, error?.message ?? String(error?.code ?? 'unknown')),
                );
              },
            });
            this.emit(placement, 'showing');
            this.analytics.adShown(name);
            void Promise.resolve(result).catch((error: unknown) => {
              settle('error', () =>
                this.analytics.adShowFailed(
                  name,
                  error instanceof Error ? error.message : 'render_failed',
                ),
              );
            });
          } catch (error) {
            settle('error', () =>
              this.analytics.adShowFailed(
                name,
                error instanceof Error ? error.message : 'render_failed',
              ),
            );
          }
        };

        // This is deliberately the documented РСЯ invocation form. The
        // loader replaces `yaContextCb` with its own live queue once ready,
        // so it is also the supported way to add a callback after load.
        window.yaContextCb!.push(render);
      });
    } finally {
      this.showInFlight[placement] = false;
    }
  }
}
