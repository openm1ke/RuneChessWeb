import { installWriteThroughStore } from './persistentStore';

/**
 * Playgama Bridge — the SDK every game on Playgama and its partner network
 * has to carry (https://wiki.playgama.com/playgama/bridge-sdk/api).
 *
 * Bridge is loaded by a plain script tag that only the Playgama build has
 * (see vite.config.ts), and it maps each call onto whichever platform the
 * game is actually running on. Outside any of them — local development —
 * it runs a mock that answers with safe defaults instead of throwing.
 *
 * The platform's six required steps, and where each one lives:
 *
 *  1. wait for `bridge.initialize()` ............ [startPlaygama]
 *  2. localise from `platform.language` ......... [playgamaLanguage]
 *  3. keep progress in `bridge.storage` ......... [startPlaygama] + persistentStore
 *  4. obey the pause and audio events ........... [watchPlaygamaPauseAndAudio]
 *  5. `sendMessage('game_ready')` ............... [reportPlaygamaGameReady]
 *  6. interstitials at natural pauses ........... [showPlaygamaInterstitial]
 */

type BridgeEventName = 'PAUSE_STATE_CHANGED' | 'AUDIO_STATE_CHANGED' | 'REWARDED_STATE_CHANGED' | 'INTERSTITIAL_STATE_CHANGED';

export type PlaygamaRewardedState = 'loading' | 'opened' | 'closed' | 'rewarded' | 'failed';

export interface PlaygamaBridge {
  initialize(): Promise<void>;
  EVENT_NAME: Record<BridgeEventName, string>;
  platform: {
    id: string;
    language: string;
    isAudioEnabled: boolean;
    sendMessage(message: string): unknown;
    on(event: string, callback: (value: boolean) => void): void;
  };
  storage: {
    get(keys: string[]): Promise<unknown[]>;
    set(keys: string[], values: string[]): Promise<void>;
    delete(keys: string[]): Promise<void>;
  };
  advertisement: {
    isRewardedSupported: boolean;
    isInterstitialSupported: boolean;
    showRewarded(placement?: string): unknown;
    showInterstitial(placement?: string): unknown;
    on(event: string, callback: (state: string) => void): void;
  };
}

declare global {
  interface Window {
    bridge?: PlaygamaBridge;
  }
}

/** How long to wait for the SDK before starting without it. Bridge loads a
 * platform adapter over the network first, so it can take a moment; a
 * player looking at a blank frame for longer than this has already left. */
const INIT_TIMEOUT_MS = 10_000;

let ready: PlaygamaBridge | null = null;

/** The SDK once [startPlaygama] has brought it up, or null. */
export function playgamaBridge(): PlaygamaBridge | null {
  return ready;
}

/**
 * Brings Bridge up and loads every saved key before the app is drawn.
 *
 * Resolves either way: a game that will not start because an ad SDK did
 * not is the worst outcome on offer. Without Bridge the game still runs —
 * on the browser's own storage, which is what the store falls back to.
 */
export async function startPlaygama(keys: readonly string[]): Promise<PlaygamaBridge | null> {
  const bridge = window.bridge;
  if (!bridge) return null;
  try {
    await withTimeout(bridge.initialize(), INIT_TIMEOUT_MS);
  } catch (error) {
    warn('initialize', error);
    return null;
  }
  ready = bridge;
  try {
    const values = await withTimeout(bridge.storage.get([...keys]), INIT_TIMEOUT_MS);
    const initial = new Map<string, string>();
    keys.forEach((key, i) => {
      const value = values[i];
      if (value == null) return;
      // Some platforms hand back what they parsed, not what was stored.
      initial.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    installWriteThroughStore(initial, queueWrite);
  } catch (error) {
    // No saves to read means none to write either: staying on the browser's
    // own storage keeps progress at least for this device.
    warn('storage.get', error);
  }
  return bridge;
}

/** Writes are batched to one call per tick: finishing a level touches half
 * a dozen keys at once, and each `storage.set` may be a network request. */
const pendingSets = new Map<string, string>();
const pendingDeletes = new Set<string>();
let flushQueued = false;

function queueWrite(key: string, value: string | null): void {
  if (value == null) {
    pendingSets.delete(key);
    pendingDeletes.add(key);
  } else {
    pendingDeletes.delete(key);
    pendingSets.set(key, value);
  }
  if (flushQueued) return;
  flushQueued = true;
  window.setTimeout(flushWrites, 0);
}

function flushWrites(): void {
  flushQueued = false;
  const bridge = ready;
  if (!bridge) return;
  if (pendingSets.size > 0) {
    const keys = [...pendingSets.keys()];
    const values = [...pendingSets.values()];
    pendingSets.clear();
    bridge.storage.set(keys, values).catch((error) => warn('storage.set', error));
  }
  if (pendingDeletes.size > 0) {
    const keys = [...pendingDeletes];
    pendingDeletes.clear();
    bridge.storage.delete(keys).catch((error) => warn('storage.delete', error));
  }
}

/** The platform's language as a bare code (`ru`, `en`, …), or null. */
export function playgamaLanguage(): string | null {
  const language = ready?.platform.language;
  return language ? language.slice(0, 2).toLowerCase() : null;
}

/**
 * Silences the game whenever the platform asks: another tab, a minimised
 * window, an ad on screen. A game that keeps playing music behind an ad
 * fails moderation outright.
 */
export function watchPlaygamaPauseAndAudio(handlers: { onSilence: () => void; onRestore: () => void }): void {
  const bridge = ready;
  if (!bridge) return;
  let paused = false;
  let audioOff = !bridge.platform.isAudioEnabled;
  const apply = () => (paused || audioOff ? handlers.onSilence() : handlers.onRestore());
  bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, (isPaused) => {
    paused = isPaused;
    apply();
  });
  bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, (isEnabled) => {
    audioOff = !isEnabled;
    apply();
  });
  if (audioOff) handlers.onSilence();
}

let gameReadySent = false;

/** Tells the platform the first playable frame is up, once. */
export function reportPlaygamaGameReady(): void {
  if (gameReadySent || !ready) return;
  gameReadySent = true;
  ready.platform.sendMessage('game_ready');
}

/**
 * An interstitial between levels — the placement Playgama requires for the
 * revenue share. Bridge itself keeps the minimum gap between two of them
 * (60 seconds by default), so calling this on every level change is fine:
 * most calls are simply declined.
 */
export function showPlaygamaInterstitial(placement: string): void {
  const bridge = ready;
  if (!bridge || !bridge.advertisement.isInterstitialSupported) return;
  try {
    bridge.advertisement.showInterstitial(placement);
  } catch (error) {
    warn('showInterstitial', error);
  }
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
  console.warn(`Playgama: ${action} failed`, error);
}
