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

/**
 * The looping music runs on Web Audio, not on an `<audio>` element, and
 * that is the whole reason this class exists.
 *
 * A browser treats a long-playing media element as "media the user is
 * listening to" and puts its own transport panel on screen — play, pause,
 * volume, the page's title. Yandex Games rejected the game for exactly
 * that (§1.6.2.5, "в десктопной версии отображается системный плеер"): the
 * panel appeared over the game in the top-left corner of the browser.
 * Nothing in the Media Session API hides it; the only way not to summon it
 * is not to play through an element at all. A decoded buffer behind a gain
 * node produces the same sound and no panel.
 *
 * Short effects below still use `new Audio()` on purpose — they are a
 * second or two long, far under the threshold that raises the panel, and
 * they are fired from leaf components that should not have to know about
 * an audio graph.
 */
let sharedContext: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  const Ctor = window.AudioContext ?? (window as unknown as {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
}

/** Browsers start the graph suspended until the player touches something.
 * Every entry point calls this; before the first gesture it simply fails
 * and the track stays silent, exactly as a blocked `play()` did. */
async function resumeContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') await ctx.resume();
}

/** One looping track: fetch once, decode once, then start and stop cheaply.
 *
 * Web Audio has no pause, so pausing means stopping the node and keeping
 * the offset — the position is restored on the next start. That is why
 * `pause`/`resume` and `stop`/`play` are separate pairs here, mirroring the
 * distinction the screens already rely on: a pause keeps the place, a stop
 * starts the next room from the top. */
class LoopTrack {
  constructor(private readonly src: string) {}

  private buffer: AudioBuffer | null = null;
  private loading: Promise<AudioBuffer | null> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private startedAt = 0;
  private offset = 0;
  private playing = false;

  get isPlaying(): boolean {
    return this.playing;
  }

  private async load(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.buffer) return this.buffer;
    this.loading ??= (async () => {
      try {
        const response = await fetch(this.src);
        this.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        return this.buffer;
      } catch {
        // Music is never load-bearing: a track that will not decode simply
        // does not play, and the game carries on in silence.
        return null;
      }
    })();
    return this.loading;
  }

  /** Starts from the top, fading in. */
  async play(volume: number, fadeSeconds: number): Promise<void> {
    this.offset = 0;
    await this.startAt(0, volume, fadeSeconds);
  }

  private async startAt(offset: number, volume: number, fadeSeconds: number): Promise<void> {
    const ctx = audioContext();
    if (!ctx) return;
    const buffer = await this.load(ctx);
    if (!buffer) return;
    try {
      await resumeContext(ctx);
    } catch {
      return;
    }
    this.stopNode();
    const gain = ctx.createGain();
    gain.gain.value = fadeSeconds > 0 ? 0 : volume;
    gain.connect(ctx.destination);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(0, offset % buffer.duration);
    if (fadeSeconds > 0) {
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeSeconds);
    }
    this.source = source;
    this.gain = gain;
    this.startedAt = ctx.currentTime - offset;
    this.playing = true;
  }

  private stopNode(): void {
    try {
      this.source?.stop();
    } catch {
      // Already stopped; nothing to undo.
    }
    this.source?.disconnect();
    this.gain?.disconnect();
    this.source = null;
    this.gain = null;
  }

  private currentOffset(): number {
    const ctx = sharedContext;
    if (!ctx || !this.playing) return this.offset;
    const length = this.buffer?.duration ?? 0;
    if (!length) return 0;
    return (ctx.currentTime - this.startedAt) % length;
  }

  /** Fades out and stops; the next [play] begins from the top. */
  async stop(fadeSeconds: number): Promise<void> {
    if (!this.playing) return;
    const ctx = sharedContext;
    if (fadeSeconds > 0 && ctx && this.gain) {
      this.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSeconds);
      await new Promise((resolve) => window.setTimeout(resolve, fadeSeconds * 1000));
    }
    this.stopNode();
    this.playing = false;
    this.offset = 0;
  }

  /** Stops but keeps the place — an ad, a hidden tab, a platform pause. */
  pause(): void {
    if (!this.playing) return;
    this.offset = this.currentOffset();
    this.stopNode();
    this.playing = false;
  }

  async resume(volume: number): Promise<void> {
    await this.startAt(this.offset, volume, 0);
  }

  setVolume(volume: number): void {
    if (this.gain) this.gain.gain.value = volume;
  }

  dispose(): void {
    this.stopNode();
    this.playing = false;
  }
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
  private readonly menu = new LoopTrack(MENU_TRACK);
  private readonly game = new LoopTrack(GAME_TRACK);
  private menuRequest = 0;
  private gameRequest = 0;

  enabled = true;
  volume = 0.6;

  /** The 280 ms cross-fade the Flutter app uses between the two rooms. */
  private static readonly fadeSeconds = 0.28;

  private get menuVolume(): number {
    return this.volume * 0.34;
  }
  private get gameVolume(): number {
    return this.volume * 0.25;
  }

  init(): void {
    // Both tracks are fetched and decoded lazily on first play — the menu
    // never pulls down the game track, and vice versa.
  }

  async startMenu(): Promise<void> {
    if (!this.enabled) return;
    const request = ++this.menuRequest;
    await this.menu.play(this.menuVolume, MusicService.fadeSeconds);
    if (request !== this.menuRequest) this.menu.pause();
  }

  async stopMenu(fade = false): Promise<void> {
    this.menuRequest++;
    await this.menu.stop(fade ? MusicService.fadeSeconds : 0);
  }

  async startGame(): Promise<void> {
    if (!this.enabled) return;
    const request = ++this.gameRequest;
    await this.game.play(this.gameVolume, MusicService.fadeSeconds);
    if (request !== this.gameRequest) this.game.pause();
  }

  async stopGame(fade = false): Promise<void> {
    this.gameRequest++;
    await this.game.stop(fade ? MusicService.fadeSeconds : 0);
  }

  private wasMenuPlayingBeforePause = false;
  private wasGamePlayingBeforePause = false;

  /** Stops whichever track is playing without losing its place — the
   * platform's `game_api_pause`, a hidden tab, or an ad on screen. Unlike
   * [stopMenu]/[stopGame], which are a deliberate screen change and start
   * the next room from the top. */
  pauseAll(): void {
    this.wasMenuPlayingBeforePause = this.menu.isPlaying;
    this.wasGamePlayingBeforePause = this.game.isPlaying;
    this.menu.pause();
    this.game.pause();
  }

  /** Resumes exactly what [pauseAll] stopped — a no-op for whichever track
   * was not playing at the time, so a player who muted the music stays
   * muted. */
  resumeAll(): void {
    if (this.wasMenuPlayingBeforePause) void this.menu.resume(this.menuVolume);
    if (this.wasGamePlayingBeforePause) void this.game.resume(this.gameVolume);
  }

  applyVolume(): void {
    if (!this.enabled) return;
    this.menu.setVolume(this.menuVolume);
    this.game.setVolume(this.gameVolume);
  }

  dispose(): void {
    this.menu.dispose();
    this.game.dispose();
  }
}

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
