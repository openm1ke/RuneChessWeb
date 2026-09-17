// Stars used to accumulate and mean nothing outside a few achievements. The
// rank is the cheapest honest sink — no art, no economy, no balance risk — so
// its arithmetic is the whole feature. Mirrors the mobile app's
// `test/campaign_names_test.dart`.
import { ru } from '../l10n/ru';
import { describe, expect, it } from 'vitest';
import {
  bonusCampaignName,
  mainCampaignName,
  rankTitle,
  tutorialName,
  nextRankAfter,
  playerRanks,
  rankForStars,
  starsToNextRank,
} from '../game/campaignNames';

describe('ranks', () => {
  it('gives a player with nothing yet a rank', () => {
    expect(rankTitle(ru, rankForStars(0).id)).toBe('Ученик');
    expect(starsToNextRank(0)).toBe(25);
  });

  it('climbs with stars and never skips backwards', () => {
    let previous = playerRanks[0].starsRequired - 1;
    for (const rank of playerRanks) {
      expect(rank.starsRequired).toBeGreaterThan(previous);
      previous = rank.starsRequired;
      expect(rankForStars(rank.starsRequired).id).toBe(rank.id);
      expect(rankForStars(rank.starsRequired + 1).id).toBe(rank.id);
    }
  });

  it('tops out', () => {
    const top = playerRanks[playerRanks.length - 1];
    expect(nextRankAfter(top.starsRequired)).toBeNull();
    expect(starsToNextRank(top.starsRequired)).toBeNull();
    expect(rankForStars(10000).id).toBe(top.id);
    // 160 scored levels × 3 stars: reachable, but well past halfway.
    expect(top.starsRequired).toBeLessThan(480);
    expect(top.starsRequired).toBeGreaterThan(240);
  });

  it('names campaigns instead of describing them', () => {
    for (const name of [tutorialName(ru), mainCampaignName(ru), bonusCampaignName(ru)]) {
      expect(name).not.toBe('');
      expect(name.toLowerCase()).not.toContain('кампания');
    }
  });
});
