// performance_sample follows Playgama's contract: one aggregate per window,
// only frames of active visible play, and a pause is a gap rather than a
// frozen frame.
import { afterEach, describe, expect, it, vi } from 'vitest';

const sent: { name: string; data: Record<string, unknown> }[] = [];
let halted = false;
vi.mock('../services/playgamaPlatform', () => ({
  isPlaygamaHalted: () => halted,
  sendPlaygamaEvent: (name: string, data: Record<string, unknown>) => sent.push({ name, data }),
}));

const { setPlaygamaGameplayActive } = await import('../services/playgamaPerformance');

afterEach(() => vi.unstubAllGlobals());

describe('performance_sample', () => {
  it('aggregates active frames once and leaves a pause out', () => {
    let pending: ((t: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      pending = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const frame = (dt: number) => {
      now += dt;
      const cb = pending!;
      pending = null;
      cb(now);
    };

    setPlaygamaGameplayActive(true);
    for (let i = 0; i < 300; i++) frame(16); // ~4.8 s of smooth play
    halted = true;
    for (let i = 0; i < 100; i++) frame(100); // paused: not counted
    halted = false;
    for (let i = 0; i < 300; i++) frame(16);
    frame(120); // one hitch
    setPlaygamaGameplayActive(false);

    expect(sent).toHaveLength(1);
    const data = sent[0].data;
    expect(sent[0].name).toBe('performance_sample');
    // 599 counted frames: the first after the pause has no "last" to
    // measure from, so the pause cannot leak in as one long frame.
    expect(data.frame_count).toBe(599);
    expect(data.frames_over_100ms).toBe(1);
    expect(data.frames_over_250ms).toBe(0);
    expect(data.target_fps).toBe(60);
    expect(Number(data.fps_avg)).toBeGreaterThan(55);
  });
});
