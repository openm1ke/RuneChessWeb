import { describe, expect, it } from 'vitest';
import { computeStars, mergeBestStars } from '../game/starRating';

describe('computeStars', () => {
  it('grants 3 stars for a near-minimal, fast, hint-free solve', () => {
    expect(computeStars({ requiredMoves: 2, moveCount: 3, hintUsedCount: 0, elapsedSeconds: 10 })).toBe(3);
  });

  it('drops to 2 stars once moves exceed the 3-star budget', () => {
    expect(computeStars({ requiredMoves: 2, moveCount: 4, hintUsedCount: 0, elapsedSeconds: 10 })).toBe(2);
  });

  it('drops to 1 star once moves exceed the 2-star budget too', () => {
    expect(computeStars({ requiredMoves: 2, moveCount: 5, hintUsedCount: 0, elapsedSeconds: 10 })).toBe(1);
  });

  it('drops to 2 stars once time exceeds the 3-star budget', () => {
    expect(computeStars({ requiredMoves: 2, moveCount: 2, hintUsedCount: 0, elapsedSeconds: 45 })).toBe(2);
  });

  it('drops to 1 star once time exceeds the 2-star budget too', () => {
    expect(computeStars({ requiredMoves: 2, moveCount: 2, hintUsedCount: 0, elapsedSeconds: 1000 })).toBe(1);
  });

  it('any hint use caps the result at 1 star regardless of anything else', () => {
    expect(computeStars({ requiredMoves: 2, moveCount: 2, hintUsedCount: 1, elapsedSeconds: 1 })).toBe(1);
  });

  it('never returns less than 1 or more than 3', () => {
    const results = [
      computeStars({ requiredMoves: 5, moveCount: 500, hintUsedCount: 9, elapsedSeconds: 99999 }),
      computeStars({ requiredMoves: 1, moveCount: 1, hintUsedCount: 0, elapsedSeconds: 0 }),
    ];
    for (const stars of results) {
      expect(stars).toBeGreaterThanOrEqual(1);
      expect(stars).toBeLessThanOrEqual(3);
    }
  });

  it('budgets scale with the level size (requiredMoves)', () => {
    const tinyLevel = computeStars({ requiredMoves: 1, moveCount: 1, hintUsedCount: 0, elapsedSeconds: 60 });
    const bigLevel = computeStars({ requiredMoves: 6, moveCount: 6, hintUsedCount: 0, elapsedSeconds: 60 });
    expect(tinyLevel).toBeLessThan(3);
    expect(bigLevel).toBe(3);
  });
});

describe('mergeBestStars', () => {
  it('adopts the new result when there is no saved best', () => {
    expect(mergeBestStars(null, 2)).toBe(2);
  });

  it('keeps the saved best when the new attempt is worse', () => {
    expect(mergeBestStars(2, 1)).toBe(2);
  });

  it('adopts the new result when it is strictly better', () => {
    expect(mergeBestStars(2, 3)).toBe(3);
  });

  it('keeps the saved best when the new attempt merely ties', () => {
    expect(mergeBestStars(3, 3)).toBe(3);
  });
});
