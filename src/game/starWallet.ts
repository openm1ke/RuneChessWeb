/**
 * What the player's stars add up to, and what is left to spend. Port of the
 * Flutter app's `lib/logic/star_wallet.dart` — same arithmetic, same rule.
 *
 * Stars are earned twice over and spent once. The campaign hands out a
 * fixed 480 — three per scored level, and no more, ever — while the daily
 * challenge keeps handing out one to three a day for as long as the player
 * keeps coming back. Both go into the same lifetime total, which is what
 * ranks and achievements read: **buying a cosmetic set must never cost a
 * player their rank**, so what a purchase moves is `spent`, and the total
 * only ever grows.
 */
export interface StarWallet {
  /** Every star ever given: campaign, daily challenges, rewarded ads. */
  earned: number;
  /** Everything ever paid out for cosmetic sets. */
  spent: number;
}

export function starsAvailable(wallet: StarWallet): number {
  return wallet.earned - wallet.spent;
}

export function canAfford(wallet: StarWallet, price: number): boolean {
  return starsAvailable(wallet) >= price;
}

/**
 * The wallet after paying `price`. Refuses to go negative rather than
 * letting a rounding slip or a double click put the player in debt.
 */
export function spendStars(wallet: StarWallet, price: number): StarWallet {
  return canAfford(wallet, price)
    ? { earned: wallet.earned, spent: wallet.spent + price }
    : wallet;
}

/** How many more stars are needed, or zero when it is already affordable. */
export function starShortfall(wallet: StarWallet, price: number): number {
  return Math.max(0, price - starsAvailable(wallet));
}

/**
 * Adds up everything the player has earned. `dailyBonusStars` is what
 * rewarded ads granted on top of daily challenges, stored on its own rather
 * than folded into a day's result — the calendar shows what the player
 * actually solved, and a "6 stars" day would be a lie about the puzzle.
 */
export function starsEarned(args: {
  campaignStars: number;
  dailyStars: number;
  dailyBonusStars: number;
}): number {
  return args.campaignStars + args.dailyStars + args.dailyBonusStars;
}
