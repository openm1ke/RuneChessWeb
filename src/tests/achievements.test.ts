import { describe, expect, it } from 'vitest';
import {
  achievementCategory,
  allAchievements,
  coinFive,
  coinFour,
  coinOne,
  coinThree,
  coinTwo,
  coinZero,
  extraQueen,
  firstScoredLevelIndex,
  fiftyRook,
  hundredBishop,
  mainCampaignScoredLevelCount,
  mainKing,
  progressFor,
  totalScoredLevelCount,
  trainingPawn,
  unlockedIds,
} from '../data/achievements';

const baseArgs = {
  tutorialComplete: false,
  levelStars: new Map<number, number>(),
  hintedLevelsCount: 0,
  noHintLevelsCount: 0,
  cleanStreakLength: 0,
  perfectStreakLength: 0,
};

function perfectStars(count: number, start = firstScoredLevelIndex): Map<number, number> {
  const stars = new Map<number, number>();
  for (let i = 0; i < count; i++) stars.set(start + i, 3);
  return stars;
}

describe('unlockedIds thresholds', () => {
  it('unlocks trainingPawn only once the tutorial is complete', () => {
    expect(unlockedIds(baseArgs).has(trainingPawn.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, tutorialComplete: true }).has(trainingPawn.id)).toBe(true);
  });

  it('unlocks fiftyRook/hundredBishop at 50/100 perfect (3-star) levels', () => {
    expect(unlockedIds({ ...baseArgs, levelStars: perfectStars(49) }).has(fiftyRook.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, levelStars: perfectStars(50) }).has(fiftyRook.id)).toBe(true);
    expect(unlockedIds({ ...baseArgs, levelStars: perfectStars(99) }).has(hundredBishop.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, levelStars: perfectStars(100) }).has(hundredBishop.id)).toBe(true);
  });

  it('unlocks mainKing only when every scored level of the main campaign is 3 stars — never counting the 5 tutorial levels', () => {
    expect(mainCampaignScoredLevelCount).toBe(107);
    const almost = perfectStars(mainCampaignScoredLevelCount - 1);
    expect(unlockedIds({ ...baseArgs, levelStars: almost }).has(mainKing.id)).toBe(false);

    const complete = perfectStars(mainCampaignScoredLevelCount);
    expect(unlockedIds({ ...baseArgs, levelStars: complete }).has(mainKing.id)).toBe(true);

    // Feeding fake 3-star data into the tutorial indices (0..4) must never
    // satisfy the condition on its own — those levels never carry a real
    // star result in actual gameplay. This guards the exact boundary bug
    // fixed on the mobile app: the king used to be reachable a level early.
    const withFakeTutorialStars = new Map(almost);
    for (let i = 0; i < firstScoredLevelIndex; i++) withFakeTutorialStars.set(i, 3);
    expect(unlockedIds({ ...baseArgs, levelStars: withFakeTutorialStars }).has(mainKing.id)).toBe(false);
  });

  it('unlocks coinFive only once every scored level of every campaign is 3 stars', () => {
    // mainCampaignScoredLevelCount (107) alone is NOT enough now that the
    // bonus 7×7 campaign exists — coinFive spans every scored level.
    const onlyMainCampaign = perfectStars(mainCampaignScoredLevelCount);
    expect(unlockedIds({ ...baseArgs, levelStars: onlyMainCampaign }).has(coinFive.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, levelStars: onlyMainCampaign }).has(mainKing.id)).toBe(true);

    const complete = perfectStars(totalScoredLevelCount);
    const ids = unlockedIds({ ...baseArgs, levelStars: complete });
    expect(ids.has(coinFive.id)).toBe(true);
    expect(ids.has(mainKing.id)).toBe(true);
  });

  it('unlocks coinZero on a single hinted level and coinOne at 50', () => {
    expect(unlockedIds({ ...baseArgs, hintedLevelsCount: 0 }).has(coinZero.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, hintedLevelsCount: 1 }).has(coinZero.id)).toBe(true);
    expect(unlockedIds({ ...baseArgs, hintedLevelsCount: 49 }).has(coinOne.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, hintedLevelsCount: 50 }).has(coinOne.id)).toBe(true);
  });

  it('unlocks coinTwo at 50 no-hint levels', () => {
    expect(unlockedIds({ ...baseArgs, noHintLevelsCount: 49 }).has(coinTwo.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, noHintLevelsCount: 50 }).has(coinTwo.id)).toBe(true);
  });

  it('unlocks coinThree/coinFour purely from the clean streak length, without a star requirement', () => {
    expect(unlockedIds({ ...baseArgs, cleanStreakLength: 49 }).has(coinThree.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, cleanStreakLength: 50 }).has(coinThree.id)).toBe(true);
    expect(unlockedIds({ ...baseArgs, cleanStreakLength: 99 }).has(coinFour.id)).toBe(false);
    // 100 no-hint/no-reset levels in a row unlocks coinFour even with 0
    // stars recorded anywhere — this is the mobile session's deliberate fix
    // to stop coinFour from being a literal duplicate of extraQueen.
    expect(unlockedIds({ ...baseArgs, cleanStreakLength: 100 }).has(coinFour.id)).toBe(true);
  });

  it('unlocks extraQueen at a 100-level perfect (no-hint, 3-star) streak', () => {
    expect(unlockedIds({ ...baseArgs, perfectStreakLength: 99 }).has(extraQueen.id)).toBe(false);
    expect(unlockedIds({ ...baseArgs, perfectStreakLength: 100 }).has(extraQueen.id)).toBe(true);
  });
});

describe('progressFor', () => {
  it('reports 0/1 for a binary condition and a fraction for a counted one', () => {
    expect(progressFor(trainingPawn.id, baseArgs)).toBe(0);
    expect(progressFor(trainingPawn.id, { ...baseArgs, tutorialComplete: true })).toBe(1);
    expect(progressFor(fiftyRook.id, { ...baseArgs, levelStars: perfectStars(25) })).toBeCloseTo(0.5);
  });

  it('clamps progress at 1 even past the threshold', () => {
    expect(progressFor(coinOne.id, { ...baseArgs, hintedLevelsCount: 999 })).toBe(1);
  });

  it('tracks mainKing progress against exactly the main campaign scored level count', () => {
    const half = perfectStars(Math.floor(mainCampaignScoredLevelCount / 2));
    expect(progressFor(mainKing.id, { ...baseArgs, levelStars: half })).toBeCloseTo(
      Math.floor(mainCampaignScoredLevelCount / 2) / mainCampaignScoredLevelCount,
    );
  });
});

describe('achievementCategory', () => {
  it('tags the 5 story/mastery achievements as orbs', () => {
    for (const id of [trainingPawn.id, fiftyRook.id, hundredBishop.id, mainKing.id, extraQueen.id]) {
      expect(achievementCategory(id)).toBe('orb');
    }
  });

  it('tags the 6 player-journey achievements as coins', () => {
    for (const id of [coinZero.id, coinOne.id, coinTwo.id, coinThree.id, coinFour.id, coinFive.id]) {
      expect(achievementCategory(id)).toBe('coin');
    }
  });

  it('categorizes every achievement in the catalog with no leftovers', () => {
    const orbs = allAchievements.filter((a) => achievementCategory(a.id) === 'orb');
    const coins = allAchievements.filter((a) => achievementCategory(a.id) === 'coin');
    expect(orbs.length).toBe(5);
    expect(coins.length).toBe(6);
  });
});
