import { describe, expect, it } from 'vitest';
import { computeAttacks } from '../game/attackRules';
import { campaignLevels, campaignSolutions } from '../data/campaignLevels';
import { cellKey } from '../game/models';

describe('campaign level data', () => {
  it('has the same length for levels and their reference solutions', () => {
    expect(campaignLevels.length).toBe(campaignSolutions.length);
  });

  it('has 112 levels, matching the Flutter app', () => {
    expect(campaignLevels.length).toBe(112);
  });

  it('every level solution places exactly one figure per tray item, on distinct cells', () => {
    campaignLevels.forEach((level, index) => {
      const solution = campaignSolutions[index];
      expect(solution.length).toBe(level.tray.length);
      const uniqueCells = new Set(solution.map((cell) => cellKey(cell.c, cell.r)));
      expect(uniqueCells.size).toBe(solution.length);
    });
  });

  it('every reference solution actually solves its level (exact beacon counts, no dead figures)', () => {
    campaignLevels.forEach((level, index) => {
      const solution = campaignSolutions[index];
      const occupied = new Set(solution.map((cell) => cellKey(cell.c, cell.r)));
      const counts: Record<string, number> = {};
      let allUseful = true;
      level.tray.forEach((item, itemIndex) => {
        const cell = solution[itemIndex];
        const hits = computeAttacks({
          type: item.type,
          c: cell.c,
          r: cell.r,
          pawnDirection: item.pawnDirection,
          occupied,
        });
        const beaconHits = hits.filter((h) => level.beacons.some((b) => b.c === h.c && b.r === h.r));
        if (beaconHits.length === 0) allUseful = false;
        for (const hit of hits) {
          const key = cellKey(hit.c, hit.r);
          counts[key] = (counts[key] ?? 0) + 1;
        }
      });
      expect(allUseful).toBe(true);
      for (const beacon of level.beacons) {
        expect(counts[cellKey(beacon.c, beacon.r)] ?? 0).toBe(beacon.target);
      }
    });
  });
});
