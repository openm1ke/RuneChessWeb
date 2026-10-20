import { APP_VERSION } from '../appVersion';
import { isPlaygamaHalted, sendPlaygamaEvent } from './playgamaPlatform';

/**
 * `performance_sample` for Playgama's telemetry — the contract in its agent
 * guide: frames are measured only during active, visible gameplay, and one
 * aggregate goes out about every 30 seconds, never one event per frame.
 *
 * "Active" here is the game screen, with the page visible, the platform not
 * pausing it and no ad on top. A frame that straddles a stop — the tab came
 * back, an ad closed — is a gap, not a frozen frame, and is dropped.
 */
const TARGET_FPS = 60;
const WINDOW_MS = 30_000;
/** Less play than this in a window is not worth a sample. */
const MIN_ACTIVE_MS = 5_000;

let wanted = false;
let raf = 0;
let last: number | null = null;
let windowStart = 0;
let activeMs = 0;
let frames: number[] = [];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function flush(now: number): void {
  if (activeMs >= MIN_ACTIVE_MS && frames.length > 0) {
    const times = [...frames].sort((a, b) => a - b);
    const fps = frames.map((t) => 1000 / t).sort((a, b) => a - b);
    const over = (ms: number) => frames.filter((t) => t > ms).length;
    sendPlaygamaEvent('performance_sample', {
      target_fps: TARGET_FPS,
      window_ms: Math.round(now - windowStart),
      active_ms: Math.round(activeMs),
      frame_count: frames.length,
      fps_avg: round((frames.length * 1000) / activeMs),
      fps_p10: round(percentile(fps, 10)),
      frame_time_p50_ms: round(percentile(times, 50)),
      frame_time_p95_ms: round(percentile(times, 95)),
      frame_time_p99_ms: round(percentile(times, 99)),
      frame_time_max_ms: round(times[times.length - 1]),
      frames_over_50ms: over(50),
      frames_over_100ms: over(100),
      frames_over_250ms: over(250),
      frames_over_500ms: over(500),
      frames_over_1000ms: over(1000),
      game_version: APP_VERSION,
    });
  }
  windowStart = now;
  activeMs = 0;
  frames = [];
}

function tick(now: number): void {
  raf = requestAnimationFrame(tick);
  if (document.hidden || isPlaygamaHalted()) {
    last = null;
    return;
  }
  if (last != null) {
    const dt = now - last;
    // Longer than this is a stop the visibility and pause signals missed,
    // not a frame anyone sat through.
    if (dt < 5_000) {
      frames.push(dt);
      activeMs += dt;
    }
  }
  last = now;
  if (now - windowStart >= WINDOW_MS) flush(now);
}

/** Starts or stops sampling — on while the game screen is up. */
export function setPlaygamaGameplayActive(active: boolean): void {
  if (active === wanted) return;
  wanted = active;
  if (active) {
    last = null;
    windowStart = performance.now();
    activeMs = 0;
    frames = [];
    raf = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(raf);
    // What was measured on the way out still counts.
    flush(performance.now());
    last = null;
  }
}
