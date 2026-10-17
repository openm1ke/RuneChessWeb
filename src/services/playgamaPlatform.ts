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

/** Whether the platform has the game paused — an overlay, an ad, another
 * tab. Read through [subscribePlaygamaPause] by whatever has to stop. */
let paused = false;
/** A full-screen ad is up. Playgama draws it inside the game's own page on
 * some platforms (its sandbox among them), so nothing of ours may sit on
 * top of it: the pause shield stood over the video, which then played
 * unseen and unclickable while the button hung on "opening the ad". */
let adShowing = false;
const pauseListeners = new Set<() => void>();

/** Whether the game is paused and the pause is ours to draw — that is, not
 * while an ad, which covers the game by itself, is on screen. The clock,
 * the animations and the sound stay paused either way. */
export function isPlaygamaPaused(): boolean {
  return paused && !adShowing;
}

function notifyPause(): void {
  for (const listener of pauseListeners) listener();
}

export function subscribePlaygamaPause(listener: () => void): () => void {
  pauseListeners.add(listener);
  return () => pauseListeners.delete(listener);
}

/**
 * Obeys the platform's pause and audio requests. They are two different
 * things and Playgama's QA checks both: a pause must stop the game itself —
 * its clock, its animations, the player's input — not just the music, and
 * a muted platform must stay silent even before any music has started.
 */
/** Set by [watchPlaygamaPauseAndAudio]; everything that changes `paused`
 * goes through [setPaused] so the clock, the sound and the shield move
 * together. */
let pauseHandlers: { onPause: () => void; onResume: () => void; applySound: () => void } | null = null;
/** The current pause began while an ad was up. */
let pausedByAd = false;
/** When the last ad closed — a pause that arrives a moment after it is the
 * ad's own, delivered late, not the player leaving. */
let adEndedAt = 0;

function setPaused(next: boolean): void {
  if (next === paused) return;
  paused = next;
  if (!next) pausedByAd = false;
  if (next) pauseHandlers?.onPause();
  else pauseHandlers?.onResume();
  notifyPause();
  pauseHandlers?.applySound();
}

/**
 * The player tapped the paused game. The shield only answers taps that
 * reach it, and a tap can only reach it when the platform is no longer
 * covering the game — so a pause still standing then is one whose "resume"
 * never came. Playgama's sandbox does exactly that after a rewarded video:
 * pause on open, nothing on close, and the game sat dimmed for good.
 */
export function resumePlaygamaFromTap(): void {
  if (!adShowing) setPaused(false);
}

/**
 * Obeys the platform's pause and audio requests. They are two different
 * things and Playgama's QA checks both: a pause must stop the game itself —
 * its clock, its animations, the player's input — not just the music, and
 * a muted platform must stay silent even before any music has started.
 */
export function watchPlaygamaPauseAndAudio(handlers: {
  onSilence: () => void;
  onRestore: () => void;
  onPause: () => void;
  onResume: () => void;
}): void {
  const bridge = ready;
  if (!bridge) return;
  let audioOff = !bridge.platform.isAudioEnabled;
  const applySound = () => (paused || audioOff ? handlers.onSilence() : handlers.onRestore());
  pauseHandlers = { onPause: handlers.onPause, onResume: handlers.onResume, applySound };
  bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, (isPaused) => {
    if (isPaused && !adShowing && Date.now() - adEndedAt < 1500) return;
    if (isPaused && adShowing) pausedByAd = true;
    setPaused(isPaused);
  });
  const trackAd = (state: string) => {
    const showing = state === 'loading' || state === 'opened' || state === 'rewarded';
    if (showing === adShowing) return;
    adShowing = showing;
    if (!showing) {
      adEndedAt = Date.now();
      // The ad's pause ends with the ad, whether or not the platform says
      // so: on the sandbox it does not.
      if (pausedByAd) setPaused(false);
    }
    notifyPause();
  };
  bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, trackAd);
  bridge.advertisement.on(bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, trackAd);
  bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, (isEnabled) => {
    audioOff = !isEnabled;
    applySound();
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
