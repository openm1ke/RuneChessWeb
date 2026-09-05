import { describe, expect, it } from 'vitest';
import { FIRST_SCORED_LEVEL_INDEX, campaignLevels } from '../data/campaignLevels';
import { gameProgressFrom } from '../game/gameProgress';

describe('gameProgressFrom', () => {
  it('counts every finished level, not only the perfect ones — the '
    + 'achievements panel used to say "Пройдено уровней" while counting '
    + 'three-star results, so nine finished levels showed as four', () => {
    const progress = gameProgressFrom({
      unlockedLevels: new Set(Array.from({ length: 10 }, (_, i) => i)),
      highestUnlocked: 9,
      levelStars: new Map([
        [5, 3],
        [6, 1],
        [7, 2],
      ]),
    });

    expect(progress.completedLevels).toBe(9);
    expect(progress.stars).toBe(6);
  });

  it('the last level has no successor to advance the frontier past it, so '
    + 'its recorded stars are what mark it finished', () => {
    const lastIndex = campaignLevels.length - 1;
    const progress = gameProgressFrom({
      unlockedLevels: new Set(Array.from({ length: campaignLevels.length }, (_, i) => i)),
      highestUnlocked: lastIndex,
      levelStars: new Map([[lastIndex, 3]]),
    });

    expect(progress.completedLevels).toBe(campaignLevels.length);
  });

  it('totals cover every level, and stars only the scored ones', () => {
    const progress = gameProgressFrom({
      unlockedLevels: new Set(),
      highestUnlocked: 0,
      levelStars: new Map(),
    });

    expect(progress.totalLevels).toBe(campaignLevels.length);
    expect(progress.maxStars).toBe((campaignLevels.length - FIRST_SCORED_LEVEL_INDEX) * 3);
  });
});
