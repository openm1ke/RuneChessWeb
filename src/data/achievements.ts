import { campaignLevels, MAIN_CAMPAIGN_LEVEL_COUNT } from './campaignLevels';
import { FIRST_SCORED_LEVEL_INDEX } from '../game/dozorEngine';
import { asset } from '../lib/assetUrl';

/** A permanent milestone shown in the player's achievement cabinet. The
 * conditions intentionally use only locally-saved progress, so achievements
 * work offline and never require an account — a straight port of the
 * mobile app's `AchievementCatalog` (see docs/ACHIEVEMENTS_SPEC.md in the
 * Flutter repo, the source of truth for every id/condition below). */
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  assetPath: string;
}

/** Every level index at or above this is scored — mirrors
 * `DozorController.firstScoredLevelIndex` / `FIRST_SCORED_LEVEL_INDEX`. The
 * 5 tutorial levels below it never carry a star result, so a star-based
 * condition must never require them. */
export const firstScoredLevelIndex = FIRST_SCORED_LEVEL_INDEX;

/** Number of scored levels in the ORIGINAL 6×6 campaign only — «Хранитель
 * короны» requires 3★ on exactly these, not the bonus 7×7 campaign too.
 * Deliberately derived from the fixed `MAIN_CAMPAIGN_LEVEL_COUNT` boundary
 * rather than `campaignLevels.length` (which now also includes the bonus
 * campaign) — mirrors the mobile app's
 * `kMainCampaignLevelCount - firstScoredLevelIndex`. */
export const mainCampaignScoredLevelCount = MAIN_CAMPAIGN_LEVEL_COUNT - firstScoredLevelIndex;

/** Number of scored levels across EVERY campaign — used by «Легенда
 * RuneChess» (which does span both) and by the achievements cabinet's
 * "Пройдено уровней" stat. Grows automatically as campaigns are added. */
export const totalScoredLevelCount = campaignLevels.length - firstScoredLevelIndex;

const iconPath = (name: string) => asset(`assets/images/achievements/${name}.webp`);

export const trainingPawn: AchievementDefinition = {
  id: 'training_pawn',
  title: 'Первый ход',
  description: 'Пройдите обучение.',
  assetPath: iconPath('training-pawn'),
};

export const fiftyRook: AchievementDefinition = {
  id: 'fifty_rook',
  title: 'Верный расчёт',
  description: 'Получите 3 звезды на 50 уровнях.',
  assetPath: iconPath('fifty-rook'),
};

export const hundredBishop: AchievementDefinition = {
  id: 'hundred_bishop',
  title: 'Мастер диагоналей',
  description: 'Получите 3 звезды на 100 уровнях.',
  assetPath: iconPath('hundred-bishop'),
};

export const mainKing: AchievementDefinition = {
  id: 'main_campaign_king',
  title: 'Хранитель короны',
  description: 'Пройдите основную кампанию на 3 звезды.',
  assetPath: iconPath('main-king'),
};

export const extraQueen: AchievementDefinition = {
  id: 'extra_campaign_queen',
  title: 'Владыка рун',
  description: 'Пройдите 100 уровней подряд на 3 звезды без подсказок.',
  assetPath: iconPath('extra-queen'),
};

export const coinZero: AchievementDefinition = {
  id: 'coin_zero_first_hint',
  title: 'Первая подсказка',
  description: 'Возьмите подсказку на уровне основной или дополнительной кампании.',
  assetPath: iconPath('coin-0'),
};

export const coinOne: AchievementDefinition = {
  id: 'coin_one_fifty_hint_levels',
  title: 'Рунный проводник',
  description: 'Возьмите подсказки на 50 разных уровнях.',
  assetPath: iconPath('coin-1'),
};

export const coinTwo: AchievementDefinition = {
  id: 'coin_two_fifty_without_hints',
  title: 'Самостоятельный путь',
  description: 'Пройдите 50 разных уровней без подсказок.',
  assetPath: iconPath('coin-2'),
};

export const coinThree: AchievementDefinition = {
  id: 'coin_three_fifty_clean_streak',
  title: 'Непрерывный расчёт',
  description: 'Пройдите 50 уровней подряд без подсказок и сбросов.',
  assetPath: iconPath('coin-3'),
};

export const coinFour: AchievementDefinition = {
  id: 'coin_four_hundred_perfect_streak',
  title: 'Безупречная серия',
  description: 'Пройдите 100 уровней подряд без подсказок и сбросов.',
  assetPath: iconPath('coin-4'),
};

export const coinFive: AchievementDefinition = {
  id: 'coin_five_all_campaigns_perfect',
  title: 'Легенда RuneChess',
  description: 'Пройдите все уровни основной и дополнительной кампаний на 3 звезды.',
  assetPath: iconPath('coin-5'),
};

export const allAchievements: AchievementDefinition[] = [
  trainingPawn,
  coinZero,
  coinOne,
  coinTwo,
  fiftyRook,
  coinThree,
  hundredBishop,
  mainKing,
  coinFour,
  extraQueen,
  coinFive,
];

export function perfectLevelCount(levelStars: Map<number, number>): number {
  let count = 0;
  for (const stars of levelStars.values()) if (stars === 3) count++;
  return count;
}

/** Every star-based/streak-based condition below is checked fresh each
 * call; the caller (`recordNewAchievements` in `App.tsx`) is what makes an
 * unlock permanent by recording the first moment it saw an id here, so a
 * streak later breaking never revokes an already-earned trophy. */
export function unlockedIds({
  tutorialComplete,
  levelStars,
  hintedLevelsCount,
  noHintLevelsCount,
  cleanStreakLength,
  perfectStreakLength,
}: {
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  hintedLevelsCount: number;
  noHintLevelsCount: number;
  cleanStreakLength: number;
  perfectStreakLength: number;
}): Set<string> {
  const unlocked = new Set<string>();
  if (tutorialComplete) unlocked.add(trainingPawn.id);

  const perfectCount = perfectLevelCount(levelStars);
  if (perfectCount >= 50) unlocked.add(fiftyRook.id);
  if (perfectCount >= 100) unlocked.add(hundredBishop.id);

  // The king is a perfect-completion trophy over exactly the scored levels
  // of the original campaign — not the 5 tutorial levels, which never
  // carry a star result at all.
  let mainCampaignPerfect = true;
  for (let offset = 0; offset < mainCampaignScoredLevelCount; offset++) {
    if (levelStars.get(firstScoredLevelIndex + offset) !== 3) {
      mainCampaignPerfect = false;
      break;
    }
  }
  if (mainCampaignPerfect) unlocked.add(mainKing.id);

  // The legend trophy spans every scored level of every campaign.
  let everyCampaignPerfect = true;
  for (let offset = 0; offset < totalScoredLevelCount; offset++) {
    if (levelStars.get(firstScoredLevelIndex + offset) !== 3) {
      everyCampaignPerfect = false;
      break;
    }
  }
  if (everyCampaignPerfect) unlocked.add(coinFive.id);

  if (hintedLevelsCount >= 1) unlocked.add(coinZero.id);
  if (hintedLevelsCount >= 50) unlocked.add(coinOne.id);
  if (noHintLevelsCount >= 50) unlocked.add(coinTwo.id);
  if (cleanStreakLength >= 50) unlocked.add(coinThree.id);
  if (cleanStreakLength >= 100) unlocked.add(coinFour.id);
  if (perfectStreakLength >= 100) unlocked.add(extraQueen.id);

  return unlocked;
}

function fraction(value: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, Math.max(0, value / target));
}

/** Fraction (0..1) of the way towards `id`'s condition, for the progress
 * bar on the achievements screen. Callers are responsible for clamping an
 * already-unlocked achievement to 1 themselves (an unlocked trophy always
 * shows full regardless of a streak later breaking). */
export function progressFor(
  id: string,
  {
    tutorialComplete,
    levelStars,
    hintedLevelsCount,
    noHintLevelsCount,
    cleanStreakLength,
    perfectStreakLength,
  }: {
    tutorialComplete: boolean;
    levelStars: Map<number, number>;
    hintedLevelsCount: number;
    noHintLevelsCount: number;
    cleanStreakLength: number;
    perfectStreakLength: number;
  },
): number {
  const perfectCount = perfectLevelCount(levelStars);
  switch (id) {
    case trainingPawn.id:
      return tutorialComplete ? 1 : 0;
    case fiftyRook.id:
      return fraction(perfectCount, 50);
    case hundredBishop.id:
      return fraction(perfectCount, 100);
    case mainKing.id: {
      let done = 0;
      for (let offset = 0; offset < mainCampaignScoredLevelCount; offset++) {
        if (levelStars.get(firstScoredLevelIndex + offset) === 3) done++;
      }
      return fraction(done, mainCampaignScoredLevelCount);
    }
    case extraQueen.id:
      return fraction(perfectStreakLength, 100);
    case coinZero.id:
      return hintedLevelsCount >= 1 ? 1 : 0;
    case coinOne.id:
      return fraction(hintedLevelsCount, 50);
    case coinTwo.id:
      return fraction(noHintLevelsCount, 50);
    case coinThree.id:
      return fraction(cleanStreakLength, 50);
    case coinFour.id:
      return fraction(cleanStreakLength, 100);
    case coinFive.id: {
      let done = 0;
      for (let offset = 0; offset < totalScoredLevelCount; offset++) {
        if (levelStars.get(firstScoredLevelIndex + offset) === 3) done++;
      }
      return fraction(done, totalScoredLevelCount);
    }
    default:
      return 0;
  }
}
