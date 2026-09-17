import type { Strings } from '../l10n/ru';

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
export const tutorialName = (l10n: Strings) => l10n.campaignTutorialName;
export const mainCampaignName = (l10n: Strings) => l10n.campaignMainName;
export const bonusCampaignName = (l10n: Strings) => l10n.campaignBonusName;

export interface PlayerRank {
  id: RankId;
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
  { id: 'apprentice', starsRequired: 0 },
  { id: 'journeyman', starsRequired: 25 },
  { id: 'warden', starsRequired: 75 },
  { id: 'runeKeeper', starsRequired: 150 },
  { id: 'stargazer', starsRequired: 250 },
  { id: 'watchMaster', starsRequired: 400 },
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

/** Which rank this is. The words live in the language files, so a rank is
 * identity plus a threshold and nothing else — it survives being read in
 * either language. Mirrors `RankId` in the Flutter app. */
export type RankId =
  | 'apprentice'
  | 'journeyman'
  | 'warden'
  | 'runeKeeper'
  | 'stargazer'
  | 'watchMaster';

export function rankTitle(l10n: Strings, id: RankId): string {
  return {
    apprentice: l10n.rankApprentice,
    journeyman: l10n.rankJourneyman,
    warden: l10n.rankWarden,
    runeKeeper: l10n.rankRuneKeeper,
    stargazer: l10n.rankStargazer,
    watchMaster: l10n.rankWatchMaster,
  }[id];
}
