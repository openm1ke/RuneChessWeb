import { FIRST_SCORED_LEVEL_INDEX, campaignLevels } from '../data/campaignLevels';

/**
 * The two numbers every screen means when it says "how far am I": levels
 * finished, and stars collected.
 *
 * It exists because the level list and the achievements screen used to
 * compute their own, and disagreed. The achievements panel in particular was
 * labelled "Пройдено уровней" while counting only levels finished on three
 * stars, so a player who had completed nine levels was shown four. One shape,
 * built once in `App`, handed to both. Mirrors the mobile `GameProgress`.
 */
export interface GameProgress {
  /** Levels finished, however many stars they scored — including the five
   * tutorial levels, which are finished like any other even though they are
   * never scored. */
  completedLevels: number;
  totalLevels: number;
  stars: number;
  maxStars: number;
}

/**
 * `highestUnlocked` is the frontier: every level below it has been surpassed,
 * and so finished. The last level of a campaign has no successor to unlock,
 * so the frontier never moves past it — a recorded star result catches that
 * one, and any other scored level.
 */
export function gameProgressFrom({
  unlockedLevels,
  highestUnlocked,
  levelStars,
}: {
  unlockedLevels: Set<number>;
  highestUnlocked: number;
  levelStars: Map<number, number>;
}): GameProgress {
  const totalLevels = campaignLevels.length;
  let completedLevels = 0;
  for (let index = 0; index < totalLevels; index++) {
    const completed =
      unlockedLevels.has(index) && (index < highestUnlocked || levelStars.get(index) != null);
    if (completed) completedLevels++;
  }
  let stars = 0;
  for (const value of levelStars.values()) stars += value;
  return {
    completedLevels,
    totalLevels,
    stars,
    maxStars: (totalLevels - FIRST_SCORED_LEVEL_INDEX) * 3,
  };
}
