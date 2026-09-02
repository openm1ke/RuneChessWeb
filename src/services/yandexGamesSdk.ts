/**
 * Yandex Games platform SDK — required for publishing in the games.yandex.ru
 * catalog (moderation requirement 1.1: "SDK Яндекс Игр встроен в игру").
 * See YANDEX_GAMES_PLATFORM_PLAN.md for the full picture; this file is the
 * "Обязательная интеграция SDK" section of that plan.
 *
 * The loader script (`https://yandex.ru/games/sdk/v2`) is included
 * unconditionally in index.html — on the plain runechess.ru site (outside
 * the Yandex Games iframe) `window.YaGames` simply never appears, which
 * [getYandexGamesSdk] treats as "not on the platform", not an error. Nothing
 * else in the app needs to know which environment it's in beyond that.
 */

export interface YandexGamesSdk {
  features: {
    LoadingAPI: { ready: () => void };
    GameplayAPI: { start: () => void; stop: () => void };
  };
  environment: { app: { id: string }; i18n: { lang: string } };
  on: (event: 'game_api_pause' | 'game_api_resume', callback: () => void) => void;
  off: (event: 'game_api_pause' | 'game_api_resume', callback: () => void) => void;
}

/** `YaGames.init()` resolves even outside the real Yandex Games iframe, with
 * a harmless standalone-environment SDK object — so its mere presence can't
 * be used to gate anything platform-specific (notably: which rewarded-ads
 * backend to use, see RewardedAdsService vs the not-yet-built `ysdk.adv`
 * integration in YANDEX_GAMES_PLATFORM_PLAN.md). The one field that reliably
 * tells the two apart is `environment.app.id`: it's the real numeric game ID
 * from the console when actually embedded, and an empty string everywhere
 * else (confirmed live — see the ad-gating fix for why this matters). */
export function isRealYandexGamesPlatform(sdk: YandexGamesSdk): boolean {
  return sdk.environment.app.id !== '';
}

declare global {
  interface Window {
    YaGames?: { init: () => Promise<YandexGamesSdk> };
  }
}

/** Languages the game actually has text for — see the "Игра переведена на"
 * field in the console draft. Just `ru` today; add to this set the moment a
 * second language's copy exists, and [applyPlatformLanguage] picks it up
 * with no other changes needed. */
const SUPPORTED_LANGS = new Set(['ru']);
const DEFAULT_LANG = 'ru';

/** Moderation requirement 2.14: language must be auto-detected through the
 * SDK, not hardcoded — `index.html`'s static `lang="ru"` alone doesn't
 * satisfy that even though it's the only language we ship, because nothing
 * was actually reading `environment.i18n.lang`. This is the fix: read it,
 * and use it whenever it's one we have copy for; otherwise fall back to the
 * declared default (never to whatever the platform reports, since showing
 * an unsupported language would just be blank/wrong UI text). */
export function applyPlatformLanguage(sdk: YandexGamesSdk): void {
  const lang = sdk.environment.i18n.lang;
  document.documentElement.lang = SUPPORTED_LANGS.has(lang) ? lang : DEFAULT_LANG;
}

/** Safety net in case `YaGames.init()` ever hangs (e.g. a broken/blocked
 * load of the SDK script) — falls back to "not on the platform" rather than
 * leaving the app waiting forever. In practice `init()` resolves quickly
 * even outside the Yandex Games iframe, with a standalone-environment SDK
 * object (harmless there — `LoadingAPI.ready()`/`GameplayAPI` are simply
 * no-ops off-platform). */
const INIT_TIMEOUT_MS = 4000;

let sdkPromise: Promise<YandexGamesSdk | null> | null = null;

export function getYandexGamesSdk(): Promise<YandexGamesSdk | null> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      if (typeof window === 'undefined' || !window.YaGames) return null;
      try {
        const sdk = await Promise.race([
          window.YaGames.init(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), INIT_TIMEOUT_MS)),
        ]);
        return sdk ?? null;
      } catch {
        return null;
      }
    })();
  }
  return sdkPromise;
}

/** Marks gameplay as ready and wires the pause/resume lifecycle exactly
 * once, no matter how many times this is called (React StrictMode's dev-only
 * double effect invocation included) — [getYandexGamesSdk] already caches
 * the underlying `init()` call, but calling `LoadingAPI.ready()` or `on()`
 * twice is still a distinct, separately-observable mistake the SDK warns
 * about on its own. */
let platformStarted = false;

export function startYandexGamesPlatform(
  sdk: YandexGamesSdk,
  handlers: { onPause: () => void; onResume: () => void },
): void {
  if (platformStarted) return;
  platformStarted = true;
  sdk.features.LoadingAPI.ready();
  sdk.on('game_api_pause', handlers.onPause);
  sdk.on('game_api_resume', handlers.onResume);
}
