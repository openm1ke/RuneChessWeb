import type { VKBridge } from '@vkontakte/vk-bridge';
import { installWriteThroughStore } from './persistentStore';

/**
 * VK Bridge — what a game in the VK Games catalogue runs on
 * (https://dev.vk.ru/ru/mini-apps-rules, https://github.com/VKCOM/vk-bridge).
 *
 * The rules this file answers, and where:
 *
 *  - 2.2.1  Bridge connected and initialised ......... [startVk]
 *  - 2.3.8  progress follows the player across devices [startVk] + VK Storage
 *  - 3.1.2  the player's VK language, else Russian ... [vkLanguage]
 *  - 2.2.5  sound stops when the app is hidden ....... [watchVkView]
 *  - 3.2.2  the mobile client's safe areas ........... [vkInsets]
 *  - 4.2.2  VK's own ads, nobody else's .............. [showVkInterstitial]
 *           and vkRewardedAdsService.ts
 *  - 5.1.5.2 no ad at launch, none within 30 s of another [mayShowAdNow]
 *
 * Opened outside VK — a local build, the page loaded directly — Bridge is
 * not embedded: the game then plays on the browser's own storage, without
 * ads, and with the hint free, exactly as on the site.
 */

/** How long to wait for VK before starting without it. */
const INIT_TIMEOUT_MS = 8_000;

let ready = false;
let language: string | null = null;
/** Loaded by [startVk] only, so the site's and the other catalogues'
 * bundles never run it: Bridge starts listening to the page's messages the
 * moment it is imported. */
let bridge: VKBridge = null as unknown as VKBridge;

export function isVkReady(): boolean {
  return ready;
}

/** Bridge, once [startVk] has brought it up. */
export function vkBridge(): VKBridge {
  return bridge;
}

/** The player's VK language as a bare code (`ru`, `en`, …), or null. */
export function vkLanguage(): string | null {
  return language;
}

/**
 * Brings Bridge up and loads every saved key before the app is drawn.
 *
 * Resolves either way: a game that will not start because the platform
 * answered slowly is the worst outcome on offer, and rule 2.2.2 forbids an
 * endless loading screen outright.
 */
export async function startVk(keys: readonly string[]): Promise<void> {
  try {
    bridge = (await import('@vkontakte/vk-bridge')).default;
  } catch (error) {
    warn('import', error);
    return;
  }
  if (!bridge.isEmbedded()) return;
  try {
    await withTimeout(bridge.send('VKWebAppInit'), INIT_TIMEOUT_MS);
  } catch (error) {
    warn('VKWebAppInit', error);
    return;
  }
  ready = true;
  subscribeToBridge();
  try {
    const params = await withTimeout(bridge.send('VKWebAppGetLaunchParams'), INIT_TIMEOUT_MS);
    language = params.vk_language ? String(params.vk_language).slice(0, 2).toLowerCase() : null;
  } catch (error) {
    warn('VKWebAppGetLaunchParams', error);
  }
  try {
    applyConfig(await withTimeout(bridge.send('VKWebAppGetConfig'), 3_000));
  } catch {
    // The browser's own safe areas remain the fallback.
  }
  try {
    const cloud = await readCloud(keys);
    const chosen = chooseSave(cloud, readLocal(keys));
    installWriteThroughStore(chosen, queueWrite);
    // The first launch inside VK carries over what this browser already
    // had, and a newer device copy replaces the cloud's.
    if (chosen !== cloud) for (const [key, value] of chosen) if (key !== SAVED_AT_KEY) queueWrite(key, value);
  } catch (error) {
    // Without the cloud the game keeps progress on this device, stamped as
    // newer with every save, so the next launch that reaches the cloud
    // hands it over instead of losing it.
    warn('VKWebAppStorageGet', error);
    installWriteThroughStore(readLocal(keys), queueWrite);
  }
  void preloadAds();
}

// ---------------------------------------------------------------------------
// Storage.
//
// VK Storage keeps strings per user under keys of [a-zA-Z_\-0-9], up to 100
// characters, each value cut at 4096 bytes — and the documentation of the
// underlying API method gives 2236 characters for a serialized string. It
// allows 1000 calls an hour per user, and has no delete: an empty value is
// a missing key. So:
//
//  - each value is stored with a one-letter prefix, `v` for the value
//    itself, `c` for "split into N parts", so that an empty string stays a
//    value and an empty key means "removed";
//  - a value longer than [CHUNK] characters goes into parts `<key>-0`,
//    `<key>-1`, … — the daily history grows by a few dozen characters a
//    day and passes the limit within a year;
//  - writes are gathered for [FLUSH_DELAY_MS] and sent once, and sent at
//    once when VK hides the app or the page goes away;
//  - every flush also writes [SAVED_AT_KEY], here and in the browser's own
//    storage, so that a launch after a stretch without the cloud keeps
//    whichever copy is newer.

const CHUNK = 2000;
const FLUSH_DELAY_MS = 10_000;
const SAVED_AT_KEY = 'runechess.vk_saved_at';
/** VK reads at most this many keys in one call. */
const READ_BATCH = 10;

/** `dozor.level_stars_v1` → `dozor-level_stars_v1`. */
export function vkKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** What to write to VK for one key — the main key first, then its parts. */
export function encodeForVk(key: string, value: string | null): Array<[string, string]> {
  const main = vkKey(key);
  if (value == null) return [[main, '']];
  if (value.length < CHUNK) return [[main, `v${value}`]];
  const parts: Array<[string, string]> = [];
  for (let i = 0; i * CHUNK < value.length; i++) {
    parts.push([`${main}-${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK)]);
  }
  return [[main, `c${parts.length}`], ...parts];
}

/** Reads one key back from what VK holds; [part] fetches a part's text. */
export function decodeFromVk(stored: string | undefined, part: (index: number) => string | undefined): string | null {
  if (!stored) return null;
  if (stored[0] === 'v') return stored.slice(1);
  if (stored[0] !== 'c') return null;
  const count = Number.parseInt(stored.slice(1), 10);
  if (!Number.isInteger(count) || count < 1) return null;
  let value = '';
  for (let i = 0; i < count; i++) {
    const text = part(i);
    // A part missing means a write cut short: better no value than half.
    if (text == null) return null;
    value += text;
  }
  return value;
}

async function storageGet(keys: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += READ_BATCH) batches.push(keys.slice(i, i + READ_BATCH));
  const answers = await Promise.all(
    batches.map((batch) => withTimeout(bridge.send('VKWebAppStorageGet', { keys: batch }), INIT_TIMEOUT_MS)),
  );
  for (const answer of answers) {
    for (const { key, value } of answer.keys) if (value) found.set(key, value);
  }
  return found;
}

async function readCloud(keys: readonly string[]): Promise<Map<string, string>> {
  const stored = await storageGet([...keys, SAVED_AT_KEY].map(vkKey));
  const partKeys: string[] = [];
  for (const key of keys) {
    const head = stored.get(vkKey(key));
    if (head?.[0] !== 'c') continue;
    const count = Number.parseInt(head.slice(1), 10);
    for (let i = 0; i < count; i++) partKeys.push(`${vkKey(key)}-${i}`);
  }
  const parts = partKeys.length > 0 ? await storageGet(partKeys) : new Map<string, string>();
  const values = new Map<string, string>();
  for (const key of [...keys, SAVED_AT_KEY]) {
    const value = decodeFromVk(stored.get(vkKey(key)), (i) => parts.get(`${vkKey(key)}-${i}`));
    if (value != null) values.set(key, value);
  }
  return values;
}

function readLocal(keys: readonly string[]): Map<string, string> {
  const values = new Map<string, string>();
  try {
    for (const key of [...keys, SAVED_AT_KEY]) {
      const value = window.localStorage.getItem(key);
      if (value != null) values.set(key, value);
    }
  } catch {
    // A frame denied storage simply has no local copy.
  }
  return values;
}

/** The newer of the two copies: the cloud unless this device saved later
 * — progress made while the cloud could not be reached. */
export function chooseSave(cloud: Map<string, string>, local: Map<string, string>): Map<string, string> {
  if (cloud.size === 0) return local;
  const savedAt = (copy: Map<string, string>) => Number(copy.get(SAVED_AT_KEY) ?? 0) || 0;
  return savedAt(local) > savedAt(cloud) ? local : cloud;
}

const pending = new Map<string, string | null>();
let flushTimer: number | null = null;

function queueWrite(key: string, value: string | null): void {
  pending.set(key, value);
  // The local copy is written at once: it is what survives a closed tab
  // before the batch has gone out.
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // The cloud copy is enough.
  }
  if (flushTimer == null) flushTimer = window.setTimeout(flushWrites, FLUSH_DELAY_MS);
}

/** Sends everything gathered so far. Called on its timer and whenever the
 * app is about to stop running. */
export function flushWrites(): void {
  if (flushTimer != null) window.clearTimeout(flushTimer);
  flushTimer = null;
  if (!ready || pending.size === 0) return;
  const savedAt = String(Date.now());
  pending.set(SAVED_AT_KEY, savedAt);
  try {
    window.localStorage.setItem(SAVED_AT_KEY, savedAt);
  } catch {
    // As above.
  }
  const writes = [...pending].flatMap(([key, value]) => encodeForVk(key, value));
  pending.clear();
  for (const [key, value] of writes) {
    bridge.send('VKWebAppStorageSet', { key, value }).catch((error: unknown) => warn('VKWebAppStorageSet', error));
  }
}

// ---------------------------------------------------------------------------
// Lifecycle, safe areas.

let viewHandlers: { onHide: () => void; onRestore: () => void } | null = null;

/** VK hides the app — the mobile client's home button, another app on top
 * — and brings it back. The music and the attempt's clock stop with it. */
export function watchVkView(handlers: { onHide: () => void; onRestore: () => void }): void {
  viewHandlers = handlers;
}

let insets = { top: 0, bottom: 0 };

/** What the VK client covers at the top and bottom of the frame. */
export function vkInsets(): { top: number; bottom: number } {
  return insets;
}

function applyInsets(next: { top?: number; bottom?: number } | undefined): void {
  if (!next) return;
  const clamp = (value: number | undefined) => (Number.isFinite(value) ? Math.max(0, Math.min(200, value!)) : 0);
  insets = { top: clamp(next.top), bottom: clamp(next.bottom) };
  const root = document.documentElement.style;
  root.setProperty('--vk-inset-top', `${insets.top}px`);
  root.setProperty('--vk-inset-bottom', `${insets.bottom}px`);
  // The layout picks portrait or landscape from the size it measures.
  window.dispatchEvent(new Event('resize'));
}

function applyConfig(config: unknown): void {
  if (config && typeof config === 'object' && 'insets' in config) {
    applyInsets((config as { insets?: { top?: number; bottom?: number } }).insets);
  }
}

function subscribeToBridge(): void {
  bridge.subscribe((event) => {
    const { type, data } = event.detail as { type: string; data?: unknown };
    switch (type) {
      case 'VKWebAppViewHide':
        flushWrites();
        viewHandlers?.onHide();
        break;
      case 'VKWebAppViewRestore':
        viewHandlers?.onRestore();
        break;
      case 'VKWebAppUpdateConfig':
        applyConfig(data);
        break;
      case 'VKWebAppUpdateInsets':
        applyConfig(data);
        break;
    }
  });
  window.addEventListener('pagehide', flushWrites);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushWrites();
  });
}

// ---------------------------------------------------------------------------
// Ads.

/** Rule 5.1.5.2: no media ad at launch, none within 30 seconds of another.
 * The interstitial keeps a wider gap of its own — between levels a player
 * who solves one a minute would otherwise see one every other level. */
const LAUNCH_QUIET_MS = 60_000;
const INTERSTITIAL_GAP_MS = 120_000;
const startedAt = Date.now();
let lastAdAt = 0;

/** Called by both ad kinds when one finishes. */
export function noteVkAdShown(): void {
  lastAdAt = Date.now();
}

export function mayShowInterstitialNow(now = Date.now()): boolean {
  return now - startedAt >= LAUNCH_QUIET_MS && now - lastAdAt >= INTERSTITIAL_GAP_MS;
}

/** Asking VK whether an ad is available also has it load one, so the first
 * tap on «смотреть» does not wait for the network. */
async function preloadAds(): Promise<void> {
  for (const ad_format of ['reward', 'interstitial'] as const) {
    try {
      await bridge.send('VKWebAppCheckNativeAds', { ad_format });
    } catch {
      // Nothing to show yet; the next request asks again.
    }
  }
}

/**
 * An interstitial at the moment the next level loads — the one place rule
 * 5.1.5.1 allows it. [onStart] and [onEnd] silence and restore the game's
 * sound around it.
 */
export function showVkInterstitial(handlers: { onStart: () => void; onEnd: () => void }): void {
  if (!ready || !mayShowInterstitialNow()) return;
  lastAdAt = Date.now();
  handlers.onStart();
  bridge
    .send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
    .catch((error: unknown) => warn('VKWebAppShowNativeAds interstitial', error))
    .finally(() => {
      noteVkAdShown();
      handlers.onEnd();
      void bridge.send('VKWebAppCheckNativeAds', { ad_format: 'interstitial' }).catch(() => {});
    });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
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

function warn(action: string, error: unknown): void {
  console.warn(`VK: ${action} failed`, error);
}
