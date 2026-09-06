import { describe, expect, it } from 'vitest';
import {
  computeDailyChallengeStats,
  daysUntilFreezeRefill,
  formatDurationShort,
  timeUntilNextDailyChallenge,
} from '../game/dailyChallengeStats';
import type { DailyChallengeResult } from '../game/dailyChallengeLevels';

const RESULT: DailyChallengeResult = { stars: 3, hintsUsed: 0 };

function historyFor(keys: string[]): Map<string, DailyChallengeResult> {
  return new Map(keys.map((key) => [key, RESULT]));
}

describe('computeDailyChallengeStats', () => {
  it('starts with a free freeze and zero streak when there is no history', () => {
    const stats = computeDailyChallengeStats({ history: new Map(), today: new Date(2026, 0, 10) });
    expect(stats).toEqual({ currentStreak: 0, freezeAvailable: true, frozenDates: new Set() });
  });

  it('counts an unbroken run of solved days through today', () => {
    const stats = computeDailyChallengeStats({
      history: historyFor(['2026-01-01', '2026-01-02', '2026-01-03']),
      today: new Date(2026, 0, 3),
    });
    expect(stats.currentStreak).toBe(3);
    expect(stats.freezeAvailable).toBe(true);
    expect(stats.frozenDates.size).toBe(0);
  });

  it('does not treat an unplayed today as a miss', () => {
    const stats = computeDailyChallengeStats({
      history: historyFor(['2026-01-01', '2026-01-02']),
      today: new Date(2026, 0, 3),
    });
    expect(stats.currentStreak).toBe(2);
  });

  it('spends the starting freeze on a single missed day without resetting the streak', () => {
    // Solved the 1st, missed the 2nd, solved the 3rd.
    const stats = computeDailyChallengeStats({
      history: historyFor(['2026-01-01', '2026-01-03']),
      today: new Date(2026, 0, 3),
    });
    expect(stats.currentStreak).toBe(2);
    expect(stats.freezeAvailable).toBe(false);
    expect(stats.frozenDates.has('2026-01-02')).toBe(true);
  });

  it('resets the streak to 0 on a second miss once the freeze is already spent', () => {
    // Solved day 1, missed day 2 (freeze spent), missed day 3 (no freeze
    // left -> streak resets), day 4 (today) not yet played.
    const stats = computeDailyChallengeStats({
      history: historyFor(['2026-01-01']),
      today: new Date(2026, 0, 4),
    });
    expect(stats.currentStreak).toBe(0);
    expect(stats.freezeAvailable).toBe(false);
  });

  it('refills the freeze to at most one every 7-day streak', () => {
    const keys = Array.from({ length: 9 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
    // Miss day 2 only — the freeze covers it, so the streak keeps counting
    // day 1 plus days 3-9 (8 solved days) without ever resetting. The 7th
    // *consecutive* solved day (day 8) refills the freeze once spent.
    const withMiss = keys.filter((k) => k !== '2026-01-02');
    const stats = computeDailyChallengeStats({ history: historyFor(withMiss), today: new Date(2026, 0, 9) });
    expect(stats.currentStreak).toBe(8);
    expect(stats.freezeAvailable).toBe(true);
  });

  it('never accumulates more than one freeze at a time', () => {
    // 14 consecutive solved days: freeze would refill at day 7 and again be
    // eligible at day 14, but it never exceeds 1 available freeze either way.
    const keys = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(2026, 0, 1 + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const stats = computeDailyChallengeStats({ history: historyFor(keys), today: new Date(2026, 0, 14) });
    expect(stats.currentStreak).toBe(14);
    expect(stats.freezeAvailable).toBe(true);
  });
});

/** The deadline the whole mode runs on, which nothing on screen used to name. */
describe('time until the next daily', () => {
  it('counts down to local midnight, not 24h from now', () => {
    expect(timeUntilNextDailyChallenge(new Date(2026, 8, 6, 18, 30))).toBe(
      (5 * 60 + 30) * 60_000,
    );
  });

  it('is a full day exactly at midnight', () => {
    expect(timeUntilNextDailyChallenge(new Date(2026, 8, 6))).toBe(24 * 3600_000);
  });
});

describe('days until the freeze refills', () => {
  // The refill lands on every 7th day of the streak.
  it('a fresh streak needs the full week', () => {
    expect(daysUntilFreezeRefill(0)).toBe(7);
  });

  it('counts down within the week and starts over after a refill', () => {
    expect(daysUntilFreezeRefill(1)).toBe(6);
    expect(daysUntilFreezeRefill(6)).toBe(1);
    expect(daysUntilFreezeRefill(7)).toBe(7);
    expect(daysUntilFreezeRefill(9)).toBe(5);
  });
});

describe('the countdown reads at a glance', () => {
  it('never shows seconds', () => {
    expect(formatDurationShort(6 * 3600_000 + 20 * 60_000 + 42_000)).toBe('6 ч 20 мин');
    expect(formatDurationShort(3 * 3600_000)).toBe('3 ч');
    expect(formatDurationShort(40 * 60_000)).toBe('40 мин');
    expect(formatDurationShort(30_000)).toBe('меньше минуты');
  });
});
