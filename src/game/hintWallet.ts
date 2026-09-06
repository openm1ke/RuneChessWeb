/**
 * The player's stock of free hints, and when the next one arrives — the
 * mirror of the mobile app's `lib/logic/hint_wallet.dart`.
 *
 * Hints used to be available only in exchange for a rewarded ad, so whenever
 * an ad could not be loaded — no network, no fill, the remote kill-switch
 * off — the lightbulb was simply dead and a stuck player had no way forward
 * at all. That is the worst of both worlds: the player leaves, and a player
 * who left watches no ads ever again.
 *
 * Free hints regenerate slowly, and the ad becomes the *fast* path rather
 * than the only one: watch one now, or wait for the next.
 */
export interface HintWalletConfig {
  /** How many free hints a player can hold at once. */
  max: number;
  /** How long one hint takes to come back, in milliseconds. */
  refillMs: number;
}

export const defaultHintWalletConfig: HintWalletConfig = {
  max: 3,
  refillMs: 4 * 60 * 60 * 1000,
};

export interface HintWallet {
  stock: number;
  /** When the current refill window started, in epoch milliseconds. */
  lastRefillAt: number;
}

/** A new player starts with a full wallet: the first hour of play is exactly
 * when a stuck player is most likely to leave for good. */
export function initialHintWallet(
  now: number,
  config: HintWalletConfig = defaultHintWalletConfig,
): HintWallet {
  return { stock: config.max, lastRefillAt: now };
}

/** This wallet brought up to date as of `now`. */
export function refilledHintWallet(
  wallet: HintWallet,
  now: number,
  config: HintWalletConfig = defaultHintWalletConfig,
): HintWallet {
  if (wallet.stock >= config.max) return { stock: config.max, lastRefillAt: now };
  // A clock moved backwards grants nothing: the window restarts from now.
  if (now < wallet.lastRefillAt) return { stock: wallet.stock, lastRefillAt: now };
  const earned = Math.floor((now - wallet.lastRefillAt) / config.refillMs);
  if (earned <= 0) return wallet;
  const next = wallet.stock + earned;
  if (next >= config.max) return { stock: config.max, lastRefillAt: now };
  return { stock: next, lastRefillAt: wallet.lastRefillAt + earned * config.refillMs };
}

/** Milliseconds until one more hint arrives, or null when the wallet is full. */
export function hintWaitMs(
  wallet: HintWallet,
  now: number,
  config: HintWalletConfig = defaultHintWalletConfig,
): number | null {
  const current = refilledHintWallet(wallet, now, config);
  if (current.stock >= config.max) return null;
  return Math.max(0, current.lastRefillAt + config.refillMs - now);
}

/** Spends one hint. Spending from a full wallet starts the refill window at
 * that moment, which is what makes "next in 4 hours" true. */
export function spendHint(
  wallet: HintWallet,
  now: number,
  config: HintWalletConfig = defaultHintWalletConfig,
): HintWallet {
  const current = refilledHintWallet(wallet, now, config);
  if (current.stock <= 0) return current;
  return {
    stock: current.stock - 1,
    lastRefillAt: current.stock >= config.max ? now : current.lastRefillAt,
  };
}

/** Adds hints (a reward, a gift), never past the cap. */
export function grantHints(
  wallet: HintWallet,
  count: number,
  now: number,
  config: HintWalletConfig = defaultHintWalletConfig,
): HintWallet {
  const current = refilledHintWallet(wallet, now, config);
  const next = Math.min(config.max, Math.max(0, current.stock + count));
  return { stock: next, lastRefillAt: next >= config.max ? now : current.lastRefillAt };
}

/** "2 ч 40 мин", "35 мин", "меньше минуты" — read at a glance, never in
 * seconds. */
export function formatHintWait(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  if (minutes > 0) return `${minutes} мин`;
  return 'меньше минуты';
}
