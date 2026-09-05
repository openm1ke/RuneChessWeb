import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../services/analyticsService';

/** `enable()` refuses to run under `import.meta.env.DEV`, which is what the
 * test environment reports — so tests drive the private consent flag the way
 * a production build would have set it, and assert on a stubbed `ym`. */
function enabledService(): { service: AnalyticsService; ym: ReturnType<typeof vi.fn> } {
  const ym = vi.fn();
  window.ym = ym as unknown as typeof window.ym;
  const service = new AnalyticsService();
  (service as unknown as { enabled: boolean }).enabled = true;
  return { service, ym };
}

function goals(ym: ReturnType<typeof vi.fn>): { name: string; params: Record<string, unknown> }[] {
  return ym.mock.calls
    .filter((call) => call[1] === 'reachGoal')
    .map((call) => ({ name: call[2] as string, params: call[3] as Record<string, unknown> }));
}

describe('AnalyticsService', () => {
  beforeEach(() => {
    delete (window as { ym?: unknown }).ym;
  });

  it('stops reporting the moment consent is withdrawn — enable used to be '
    + 'one-way, so the counter kept firing for the rest of the session', () => {
    const { service, ym } = enabledService();

    service.settingsOpened();
    service.disable();
    service.settingsOpened();

    expect(goals(ym)).toHaveLength(1);
  });

  it('omits stars for an unscored tutorial level rather than sending 0, '
    + 'which would drag every average over the goal down', () => {
    const { service, ym } = enabledService();

    service.levelCompleted(
      2,
      true,
      { stars: null, elapsedSeconds: 12, moveCount: 3, hintUsedCount: 0 },
      'menu_play',
    );

    const [goal] = goals(ym);
    expect(goal.name).toBe('level_completed');
    expect(goal.params).not.toHaveProperty('stars');
    expect(goal.params.is_tutorial).toBe(true);
    expect(goal.params.level).toBe(3);
  });

  it('sends stars for a scored level', () => {
    const { service, ym } = enabledService();

    service.levelCompleted(
      9,
      false,
      { stars: 2, elapsedSeconds: 40, moveCount: 5, hintUsedCount: 1 },
      'level_select',
    );

    expect(goals(ym)[0].params).toMatchObject({ level: 10, is_tutorial: false, stars: 2 });
  });

  it('reports the offer separately from the ad request, so a player who saw '
    + 'it and moved on is distinguishable from one who never saw it', () => {
    const { service, ym } = enabledService();

    service.adOfferShown('bonus_star');
    service.adRequested('bonus_star');

    expect(goals(ym).map((goal) => goal.name)).toEqual(['ad_offer_shown', 'ad_requested']);
  });

  it('carries how far into the attempt a player gave up', () => {
    const { service, ym } = enabledService();

    service.levelAbandoned(6, false, { elapsedSeconds: 95, moveCount: 4, hintUsedCount: 1 });

    expect(goals(ym)[0]).toEqual({
      name: 'level_abandoned',
      params: { level: 7, is_tutorial: false, elapsed_seconds: 95, moves: 4, hints_used: 1 },
    });
  });

  it('omits the streak until there is one to report', () => {
    const { service, ym } = enabledService();

    service.dailyChallengeCompleted('2026-09-05', 3, 0);
    service.dailyChallengeCompleted('2026-09-06', 2, 1, 4);

    expect(goals(ym)[0].params).not.toHaveProperty('streak_length');
    expect(goals(ym)[1].params.streak_length).toBe(4);
  });

  it('never touches the counter while disabled, even if the tag is loaded', () => {
    const ym = vi.fn();
    window.ym = ym as unknown as typeof window.ym;

    new AnalyticsService().levelStarted(0, true, 'menu_play');

    expect(ym).not.toHaveBeenCalled();
  });
});

describe('level_abandoned deduplication', () => {
  it('two exits in the same task report one attempt, not two — a double tap '
    + 'on the back control lands before React re-renders', () => {
    const ym = vi.fn();
    window.ym = ym as unknown as typeof window.ym;
    const service = new AnalyticsService();
    (service as unknown as { enabled: boolean }).enabled = true;

    // Mirrors App's guard: a ref, checked and set synchronously.
    let reported = false;
    const report = () => {
      if (reported) return;
      reported = true;
      service.levelAbandoned(5, false, { elapsedSeconds: 10, moveCount: 1, hintUsedCount: 0 });
    };
    report();
    report();

    expect(goals(ym).filter((goal) => goal.name === 'level_abandoned')).toHaveLength(1);
  });
});

describe('rulesOpened', () => {
  beforeEach(() => {
    delete (window as { ym?: unknown }).ym;
    vi.useRealTimers();
  });

  it('waits for the counter before navigating, so the goal is not cut off '
    + 'by the page it opens', async () => {
    let ymCallback: (() => void) | undefined;
    const ym = vi.fn((_id, method, _goal, _params, cb) => {
      if (method === 'reachGoal') ymCallback = cb as () => void;
    });
    window.ym = ym as unknown as typeof window.ym;
    const service = new AnalyticsService();
    (service as unknown as { enabled: boolean }).enabled = true;

    const proceed = vi.fn();
    service.rulesOpened(proceed);

    expect(ym).toHaveBeenCalled();
    expect(proceed).not.toHaveBeenCalled();
    ymCallback?.();
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('navigates anyway when reporting is off, so a player is never stranded '
    + 'on the menu because analytics did not answer', () => {
    const proceed = vi.fn();
    new AnalyticsService().rulesOpened(proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('navigates once even if the counter also answers after the fallback', async () => {
    let ymCallback: (() => void) | undefined;
    window.ym = vi.fn((_id, method, _goal, _params, cb) => {
      if (method === 'reachGoal') ymCallback = cb as () => void;
    }) as unknown as typeof window.ym;
    const service = new AnalyticsService();
    (service as unknown as { enabled: boolean }).enabled = true;

    const proceed = vi.fn();
    service.rulesOpened(proceed);
    await new Promise((r) => setTimeout(r, 500));
    ymCallback?.();

    expect(proceed).toHaveBeenCalledTimes(1);
  });
});
