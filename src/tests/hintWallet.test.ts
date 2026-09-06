// Free hints exist so that a player without a loadable ad is never stuck —
// see `hintWallet.ts`. The arithmetic below is what makes "next hint in
// 2 ч 40 мин" a promise rather than a guess. Mirrors the mobile app's
// `test/hint_wallet_test.dart`.
import { describe, expect, it } from 'vitest';
import {
  defaultHintWalletConfig as config,
  formatHintWait,
  grantHints,
  hintWaitMs,
  initialHintWallet,
  refilledHintWallet,
  spendHint,
} from '../game/hintWallet';

const start = new Date(2026, 8, 6, 12).getTime();
const hours = (n: number) => n * 60 * 60 * 1000;

describe('hint wallet', () => {
  it('starts full for a new player', () => {
    expect(initialHintWallet(start).stock).toBe(config.max);
    expect(hintWaitMs(initialHintWallet(start), start)).toBeNull();
  });

  it('returns one hint per refill period, up to the cap', () => {
    const spent = spendHint(spendHint(initialHintWallet(start), start), start);
    expect(spent.stock).toBe(1);
    expect(refilledHintWallet(spent, start + hours(3)).stock).toBe(1);
    expect(refilledHintWallet(spent, start + hours(4)).stock).toBe(2);
    expect(refilledHintWallet(spent, start + hours(72)).stock).toBe(config.max);
  });

  it('does not bank time while full', () => {
    const idle = refilledHintWallet(initialHintWallet(start), start + hours(168));
    const later = start + hours(168);
    const spent = spendHint(spendHint(idle, later), later);
    expect(spent.stock).toBe(1);
    expect(hintWaitMs(spent, later)).toBe(hours(4));
  });

  it('grants nothing for a clock moved backwards', () => {
    const spent = spendHint(spendHint(initialHintWallet(start), start), start);
    const rewound = refilledHintWallet(spent, start - hours(48));
    expect(rewound.stock).toBe(1);
  });

  it('reports the wait once empty', () => {
    let wallet = initialHintWallet(start);
    for (let i = 0; i < config.max; i++) wallet = spendHint(wallet, start);
    expect(wallet.stock).toBe(0);
    expect(hintWaitMs(wallet, start + hours(1) + 20 * 60000)).toBe(hours(2) + 40 * 60000);
    expect(spendHint(wallet, start).stock).toBe(0);
  });

  it('tops up without exceeding the cap', () => {
    const spent = spendHint(spendHint(initialHintWallet(start), start), start);
    expect(grantHints(spent, 1, start).stock).toBe(2);
    expect(grantHints(spent, 5, start).stock).toBe(config.max);
  });

  it('writes the wait for a glance', () => {
    expect(formatHintWait(hours(2) + 40 * 60000)).toBe('2 ч 40 мин');
    expect(formatHintWait(hours(3))).toBe('3 ч');
    expect(formatHintWait(35 * 60000)).toBe('35 мин');
    expect(formatHintWait(20000)).toBe('меньше минуты');
  });
});
