import { AnalyticsService } from './analyticsService';

/**
 * Yandex Advertising Network (RSYA) integration for web Rewarded units —
 * https://yandex.ru/support/partner/web/units/types/rewarded.html
 *
 * This is the real `Ya.Context.AdvManager` API, wired up end to end
 * (loader, render, reward/error callbacks, analytics). The one missing
 * piece is a real `blockId`: RSYA does not let you create an ad block for a
 * site until that site has passed moderation (unlike the mobile Yandex Ads
 * SDK, which ships a public `demo-rewarded-yandex` unit that works with no
 * account at all — there is no equivalent public demo blockId for web).
 * [DEMO_BLOCK_ID] below is the placeholder ID from Yandex's own
 * documentation examples; it will not actually render anything until it is
 * swapped for a real one issued in partner2.yandex.ru once RSYA approves
 * runechess.ru. Nothing else in this file needs to change at that point.
 */

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context: {
        AdvManager: {
          render: (options: YandexAdvManagerRenderOptions) => Promise<unknown>;
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

export type AdPlacement = 'extraHint' | 'bonusStar';

function analyticsName(placement: AdPlacement): string {
  return placement === 'extraHint' ? 'extra_hint' : 'bonus_star';
}

/** Placeholder blockIds — see the file doc above. Swap for real ones once
 * RSYA approves the site and partner2.yandex.ru issues them. */
const DEMO_BLOCK_ID: Record<AdPlacement, string> = {
  extraHint: 'R-A-000000-1',
  bonusStar: 'R-A-000000-2',
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

/**
 * Mirrors `RewardedAdsService` in the Flutter app: one instance owns both
 * placements (`extraHint`, `bonusStar`); each is shown independently.
 * Unlike the mobile SDK, `Ya.Context.AdvManager.render()` both loads *and*
 * shows a rewarded unit in one call — there is no separate preload step —
 * so [show] is the only entry point here.
 */
export class RewardedAdsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly blockIds: Record<AdPlacement, string> = DEMO_BLOCK_ID,
  ) {
    ensureLoaderScript();
  }

  private readonly lastState: Record<AdPlacement, RewardedAdState> = {
    extraHint: 'idle',
    bonusStar: 'idle',
  };
  private readonly showInFlight: Record<AdPlacement, boolean> = {
    extraHint: false,
    bonusStar: false,
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
        window.yaContextCb!.push(() => {
          if (!window.Ya) {
            this.emit(placement, 'unavailable');
            this.analytics.adUnavailable(name);
            resolve();
            return;
          }
          window.Ya.Context.AdvManager.render({
            blockId: this.blockIds[placement],
            type: 'rewarded',
            platform: window.innerWidth < 768 ? 'touch' : 'desktop',
            onRewarded: (isRewarded) => {
              if (isRewarded) {
                this.emit(placement, 'rewarded');
                this.analytics.adRewarded(name);
              } else {
                this.emit(placement, 'closedWithoutReward');
                this.analytics.adClosedWithoutReward(name);
              }
              resolve();
            },
            onError: (error) => {
              this.emit(placement, 'error');
              this.analytics.adShowFailed(name, error?.message ?? String(error?.code ?? 'unknown'));
              resolve();
            },
          })
            .then(() => {
              this.emit(placement, 'showing');
              this.analytics.adShown(name);
            })
            .catch((error: unknown) => {
              this.emit(placement, 'error');
              this.analytics.adShowFailed(name, error instanceof Error ? error.message : 'render_failed');
              resolve();
            });
        });
      });
    } finally {
      this.showInFlight[placement] = false;
    }
  }
}
