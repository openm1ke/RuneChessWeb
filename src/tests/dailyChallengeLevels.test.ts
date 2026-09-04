import { describe, expect, it } from 'vitest';
import { computeAttacks } from '../game/attackRules';
import { cellKey } from '../game/models';
import { dailyChallengeDayIndex, dailyChallengeKey, dailyChallengeLevel } from '../game/dailyChallengeLevels';

describe('dailyChallengeKey', () => {
  it('formats a date as yyyy-MM-dd, zero-padded', () => {
    expect(dailyChallengeKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dailyChallengeKey(new Date(2026, 8, 30))).toBe('2026-09-30');
  });
});

describe('dailyChallengeDayIndex', () => {
  it('is 0 on the epoch day and increases by 1 per calendar day', () => {
    const epoch = new Date(2026, 0, 1);
    expect(dailyChallengeDayIndex(epoch)).toBe(0);
    expect(dailyChallengeDayIndex(new Date(2026, 0, 2))).toBe(1);
    expect(dailyChallengeDayIndex(new Date(2026, 0, 8))).toBe(7);
  });

  it('ignores the time-of-day component', () => {
    const morning = new Date(2026, 5, 15, 6, 0, 0);
    const night = new Date(2026, 5, 15, 23, 59, 0);
    expect(dailyChallengeDayIndex(morning)).toBe(dailyChallengeDayIndex(night));
  });
});

describe('dailyChallengeLevel', () => {
  // A spread of dates covering every weekday, so every difficulty spec's
  // generator branch runs at least once.
  const sampleDates = [
    new Date(2026, 0, 5), // Monday
    new Date(2026, 0, 6), // Tuesday
    new Date(2026, 0, 7), // Wednesday
    new Date(2026, 0, 8), // Thursday
    new Date(2026, 0, 9), // Friday
    new Date(2026, 0, 10), // Saturday
    new Date(2026, 0, 11), // Sunday
    new Date(2026, 5, 22),
    new Date(2027, 2, 3),
  ];

  it('always returns a 7x7 level with a solution positionally aligned to the tray', () => {
    for (const date of sampleDates) {
      const { level, solution } = dailyChallengeLevel(date);
      expect(level.boardSize).toBe(7);
      expect(solution.length).toBe(level.tray.length);
      for (const cell of solution) {
        expect(cell.c).toBeGreaterThanOrEqual(0);
        expect(cell.c).toBeLessThan(7);
        expect(cell.r).toBeGreaterThanOrEqual(0);
        expect(cell.r).toBeLessThan(7);
      }
    }
  });

  it('is deterministic: the same calendar day always yields an identical level', () => {
    for (const date of sampleDates) {
      const first = dailyChallengeLevel(date);
      const second = dailyChallengeLevel(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 30));
      expect(second).toEqual(first);
    }
  });

  it('the provided solution actually solves the level (every beacon hit exactly its target, no unused piece)', () => {
    for (const date of sampleDates) {
      const { level, solution } = dailyChallengeLevel(date);
      const occupied = new Set(solution.map((cell) => cellKey(cell.c, cell.r)));
      const counts = new Map<string, number>();
      const pieceHitsAny: boolean[] = [];
      level.tray.forEach((item, i) => {
        const cell = solution[i];
        const hits = computeAttacks({ type: item.type, c: cell.c, r: cell.r, occupied, boardN: level.boardSize });
        let hitAny = false;
        for (const hit of hits) {
          const key = cellKey(hit.c, hit.r);
          if (level.beacons.some((b) => b.c === hit.c && b.r === hit.r)) {
            counts.set(key, (counts.get(key) ?? 0) + 1);
            hitAny = true;
          }
        }
        pieceHitsAny.push(hitAny);
      });
      expect(pieceHitsAny.every(Boolean)).toBe(true);
      for (const beacon of level.beacons) {
        expect(counts.get(cellKey(beacon.c, beacon.r)) ?? 0).toBe(beacon.target);
      }
    }
  });

  it('places every solution cell on a distinct, non-beacon square', () => {
    for (const date of sampleDates) {
      const { level, solution } = dailyChallengeLevel(date);
      const keys = solution.map((cell) => cellKey(cell.c, cell.r));
      expect(new Set(keys).size).toBe(keys.length);
      for (const cell of solution) {
        expect(level.beacons.some((b) => b.c === cell.c && b.r === cell.r)).toBe(false);
      }
    }
  });

  it('every pawn is given the up-only direction, matching the game-wide pawn rule', () => {
    for (const date of sampleDates) {
      const { level } = dailyChallengeLevel(date);
      for (const item of level.tray) {
        if (item.type === 'pawn') expect(item.pawnDirection).toBe('up');
      }
    }
  });
});
