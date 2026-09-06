/**
 * What the three parts of the game are called, and the ranks a player climbs
 * through — the mirror of the mobile app's `lib/data/campaign_names.dart`.
 *
 * The campaigns used to be labelled by what they were rather than named:
 * "ОСНОВНАЯ КАМПАНИЯ" and "НОВАЯ КАМПАНИЯ · ПОЛЕ 7×7" — and the second stops
 * being new the moment a third arrives. The names lean on art and music that
 * already exist: the menu is a night observatory with a telescope and a
 * moonlit window, and the two music tracks are called `dozor-moonlit-garden`
 * and `dozor-velvet-observatory`.
 */
export const TUTORIAL_NAME = 'ПЕРВЫЕ РУНЫ';
export const MAIN_CAMPAIGN_NAME = 'ЛУННЫЙ САД';
export const BONUS_CAMPAIGN_NAME = 'ЗВЁЗДНАЯ ОБСЕРВАТОРИЯ';

export interface PlayerRank {
  title: string;
  starsRequired: number;
}

/**
 * A rank earned purely by collected stars.
 *
 * Stars had nowhere to go: they fed a few achievements and then simply
 * accumulated. A rank is the cheapest honest answer — no new economy, no art,
 * no balance risk — and it gives the number on the menu a meaning past
 * "number". Thresholds are spaced over the 480 stars a full campaign can
 * yield, so the last one is a genuine achievement.
 */
export const playerRanks: PlayerRank[] = [
  { title: 'Ученик', starsRequired: 0 },
  { title: 'Подмастерье', starsRequired: 25 },
  { title: 'Смотритель', starsRequired: 75 },
  { title: 'Хранитель рун', starsRequired: 150 },
  { title: 'Звездочёт', starsRequired: 250 },
  { title: 'Магистр дозора', starsRequired: 400 },
];

export function rankForStars(stars: number): PlayerRank {
  let earned = playerRanks[0];
  for (const rank of playerRanks) if (stars >= rank.starsRequired) earned = rank;
  return earned;
}

export function nextRankAfter(stars: number): PlayerRank | null {
  return playerRanks.find((rank) => stars < rank.starsRequired) ?? null;
}

export function starsToNextRank(stars: number): number | null {
  const next = nextRankAfter(stars);
  return next == null ? null : next.starsRequired - stars;
}
