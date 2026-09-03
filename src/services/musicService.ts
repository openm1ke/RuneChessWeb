import { asset } from '../lib/assetUrl';

const MENU_TRACK = asset('assets/audio/dozor-moonlit-garden.m4a');
const GAME_TRACK = asset('assets/audio/dozor-velvet-observatory.m4a');
export const STAR_CHIME_TRACK = asset('assets/audio/dozor-star-chime.m4a');
export const RESULT_COMPLETE_TRACK = asset('assets/audio/dozor-result-complete.m4a');
export const RESULT_CONTINUE_TRACK = asset('assets/audio/dozor-result-continue.m4a');
const PIECE_LIFT_TRACK = asset('assets/audio/dozor-piece-lift.m4a');
const PIECE_SET_TRACK = asset('assets/audio/dozor-piece-set.m4a');
const NAV_PRESS_TRACK = asset('assets/audio/dozor-menu-click-press.m4a');
const NAV_RELEASE_TRACK = asset('assets/audio/dozor-menu-click-release.m4a');
const ACHIEVEMENT_REVEAL_TRACK = asset('assets/audio/dozor-achievement-reveal.m4a');

/** Gates every short sound effect below (star chime, board/menu clicks) —
 * independent of the background-music `enabled`/`volume` settings, and
 * shared as module state since these are played from many leaf components
 * that don't otherwise have access to a `MusicService` instance. */
let soundEffectsEnabled = true;

export function setSoundEffectsEnabled(enabled: boolean): void {
  soundEffectsEnabled = enabled;
}

/** Plays a single short sound effect, fire-and-forget. */
function playSound(src: string, volume: number): void {
  if (!soundEffectsEnabled) return;
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    void audio.play().catch(() => {});
  } catch {
    // Ignore — sound effects are a nice-to-have, never load-bearing.
  }
}

function fadeAudio(
  audio: HTMLAudioElement,
  target: number,
  isStillCurrent: () => boolean,
  start?: number,
): Promise<void> {
  const steps = 8;
  const stepDuration = 35;
  const from = start ?? audio.volume;
  return new Promise((resolve) => {
    let step = 0;
    const tick = () => {
      if (!isStillCurrent()) return resolve();
      step++;
      const t = step / steps;
      // easeInOut cubic-ish, mirrors Curves.easeInOut closely enough for a
      // 280ms fade between the two rooms.
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      audio.volume = Math.min(1, Math.max(0, from + (target - from) * eased));
      if (step >= steps) return resolve();
      window.setTimeout(tick, stepDuration);
    };
    tick();
  });
}

/**
 * Owns the two looping background tracks (menu and in-game), fading between
 * them the same way the Flutter app's `MusicService` does. The web has no
 * equivalent of Android's `mixWithOthers` audio focus — the browser simply
 * plays multiple `<audio>` elements concurrently, so short result sounds
 * (star chimes) naturally layer over the loop without special handling.
 *
 * Each track's `<audio>` element (and its network fetch) is created lazily,
 * the first time that track is actually played — menu music never pulls
 * down the game track's file, and vice versa.
 */
export class MusicService {
  private _menuAudio: HTMLAudioElement | null = null;
  private _gameAudio: HTMLAudioElement | null = null;
  private menuRequest = 0;
  private gameRequest = 0;

  enabled = true;
  volume = 0.6;

  private get menuVolume(): number {
    return this.volume * 0.34;
  }
  private get gameVolume(): number {
    return this.volume * 0.25;
  }

  private get menuAudio(): HTMLAudioElement {
    if (!this._menuAudio) {
      this._menuAudio = new Audio();
      this._menuAudio.loop = true;
      this._menuAudio.preload = 'none';
      this._menuAudio.src = MENU_TRACK;
    }
    return this._menuAudio;
  }

  private get gameAudio(): HTMLAudioElement {
    if (!this._gameAudio) {
      this._gameAudio = new Audio();
      this._gameAudio.loop = true;
      this._gameAudio.preload = 'none';
      this._gameAudio.src = GAME_TRACK;
    }
    return this._gameAudio;
  }

  init(): void {
    // Both tracks are created lazily on first play — nothing to warm up
    // here beyond leaving this as the app's one required init hook.
  }

  async startMenu(): Promise<void> {
    if (!this.enabled) return;
    const request = ++this.menuRequest;
    try {
      const audio = this.menuAudio;
      audio.pause();
      audio.currentTime = 0;
      if (request !== this.menuRequest) return;
      audio.volume = 0;
      await audio.play();
      await fadeAudio(audio, this.menuVolume, () => request === this.menuRequest);
      if (request !== this.menuRequest) audio.pause();
    } catch {
      // Autoplay can be blocked until the first user gesture; harmless.
    }
  }

  async stopMenu(fade = false): Promise<void> {
    if (!this._menuAudio) return;
    const request = ++this.menuRequest;
    if (fade) {
      await fadeAudio(this._menuAudio, 0, () => request === this.menuRequest, this.menuVolume);
    }
    if (request !== this.menuRequest) return;
    this._menuAudio.pause();
  }

  async startGame(): Promise<void> {
    if (!this.enabled) return;
    const request = ++this.gameRequest;
    try {
      const audio = this.gameAudio;
      audio.pause();
      audio.currentTime = 0;
      if (request !== this.gameRequest) return;
      audio.volume = 0;
      await audio.play();
      await fadeAudio(audio, this.gameVolume, () => request === this.gameRequest);
      if (request !== this.gameRequest) audio.pause();
    } catch {
      // Autoplay can be blocked until the first user gesture; harmless.
    }
  }

  async stopGame(fade = false): Promise<void> {
    if (!this._gameAudio) return;
    const request = ++this.gameRequest;
    if (fade) {
      await fadeAudio(this._gameAudio, 0, () => request === this.gameRequest, this.gameVolume);
    }
    if (request !== this.gameRequest) return;
    this._gameAudio.pause();
  }

  private wasMenuPlayingBeforePause = false;
  private wasGamePlayingBeforePause = false;

  /** Pauses whichever track is currently playing without resetting its
   * position — used for the platform's `game_api_pause` event (tab losing
   * focus, an ad showing, etc.), unlike [stopMenu]/[stopGame] which are a
   * deliberate screen change and restart the track from the top next time. */
  pauseAll(): void {
    this.wasMenuPlayingBeforePause = !!this._menuAudio && !this._menuAudio.paused;
    this.wasGamePlayingBeforePause = !!this._gameAudio && !this._gameAudio.paused;
    this._menuAudio?.pause();
    this._gameAudio?.pause();
  }

  /** Resumes exactly what [pauseAll] paused — a no-op for whichever track
   * wasn't actually playing at pause time. */
  resumeAll(): void {
    if (this.wasMenuPlayingBeforePause) void this._menuAudio?.play().catch(() => {});
    if (this.wasGamePlayingBeforePause) void this._gameAudio?.play().catch(() => {});
  }

  applyVolume(): void {
    if (!this.enabled) return;
    if (this._menuAudio) this._menuAudio.volume = this.menuVolume;
    if (this._gameAudio) this._gameAudio.volume = this.gameVolume;
  }

  dispose(): void {
    this._menuAudio?.pause();
    this._gameAudio?.pause();
  }
}

/** Plays a single short sound effect (used for the per-star chime). */
export function playChime(volume = 0.38): void {
  playSound(STAR_CHIME_TRACK, volume);
}

/** Soft interaction sounds, controlled separately from background music so
 * the board stays responsive even with music disabled — see
 * `setSoundEffectsEnabled`. */
export function playPieceLift(): void {
  playSound(PIECE_LIFT_TRACK, 0.46);
}

export function playPieceSet(): void {
  playSound(PIECE_SET_TRACK, 0.42);
}

/** Two halves of a restrained desktop-style mouse click. They are separate
 * so navigation controls can play the press immediately and the release
 * only when the click is actually triggered. */
export function playNavigationPress(): void {
  playSound(NAV_PRESS_TRACK, 0.34);
}

export function playNavigationRelease(): void {
  playSound(NAV_RELEASE_TRACK, 0.3);
}

export function playResultComplete(): void {
  playSound(RESULT_COMPLETE_TRACK, 0.42);
}

export function playResultContinue(): void {
  playSound(RESULT_CONTINUE_TRACK, 0.34);
}

export function playAchievementReveal(): void {
  playSound(ACHIEVEMENT_REVEAL_TRACK, 0.5);
}
