// Sets cost stars, and stars are slow: a full campaign pays 480, the most
// expensive set is 300, and everything else has to come from daily
// challenges. Port of the Flutter app's `test/star_economy_test.dart` — the
// two platforms have to charge the same prices out of the same purse.
import { describe, expect, it } from 'vitest';

import {
  canAfford,
  spendStars,
  starShortfall,
  starsAvailable,
  starsEarned,
} from '../game/starWallet';
import { cosmeticSkins, freeSkinIds } from '../game/cosmeticSkins';

describe('the purse', () => {
  it('spends only what it has', () => {
    const wallet = { earned: 100, spent: 40 };
    expect(starsAvailable(wallet)).toBe(60);
    expect(canAfford(wallet, 60)).toBe(true);
    expect(starsAvailable(spendStars(wallet, 60))).toBe(0);
    // A price it cannot cover leaves the wallet untouched rather than
    // taking the player into debt.
    expect(spendStars(wallet, 61)).toBe(wallet);
    expect(starShortfall(wallet, 100)).toBe(40);
    expect(starShortfall(wallet, 10)).toBe(0);
  });

  it('counts campaign, daily and ad stars alike', () => {
    expect(starsEarned({ campaignStars: 480, dailyStars: 37, dailyBonusStars: 4 })).toBe(521);
  });
});

describe('prices', () => {
  it('the free sets are free and every other one is not', () => {
    for (const skin of cosmeticSkins) {
      expect(skin.price === 0, skin.id).toBe(freeSkinIds.has(skin.id));
    }
  });

  it('a whole campaign buys more than one set but not all of them', () => {
    const total = cosmeticSkins.reduce((sum, skin) => sum + skin.price, 0);
    // 480 is what every scored level, at three stars each, pays out.
    expect(total).toBeGreaterThan(480);
    expect(Math.min(...cosmeticSkins.map((skin) => skin.price))).toBeLessThan(480);
  });
});
