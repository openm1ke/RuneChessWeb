import { describe, expect, it } from 'vitest';
import { computeAttacks } from '../game/attackRules';

describe('computeAttacks', () => {
  it('rook attacks along all four straight rays, unblocked', () => {
    const hits = computeAttacks({ type: 'rook', c: 2, r: 2, occupied: new Set() });
    // 5 cells in each of the 4 directions minus overlaps at the edges of a 6x6 board.
    expect(hits).toEqual(
      expect.arrayContaining([
        { c: 0, r: 2 },
        { c: 5, r: 2 },
        { c: 2, r: 0 },
        { c: 2, r: 5 },
      ]),
    );
    expect(hits.length).toBe(10); // 2 left + 3 right + 2 up + 3 down
  });

  it('rook ray stops at (and includes) the first occupied cell', () => {
    const occupied = new Set(['4,2']);
    const hits = computeAttacks({ type: 'rook', c: 2, r: 2, occupied });
    expect(hits).toContainEqual({ c: 3, r: 2 });
    expect(hits).toContainEqual({ c: 4, r: 2 }); // blocking cell itself is hit
    expect(hits).not.toContainEqual({ c: 5, r: 2 }); // never past the blocker
  });

  it('bishop attacks only diagonals', () => {
    const hits = computeAttacks({ type: 'bishop', c: 2, r: 2, occupied: new Set() });
    expect(hits).toContainEqual({ c: 3, r: 3 });
    expect(hits).not.toContainEqual({ c: 3, r: 2 });
    expect(hits).not.toContainEqual({ c: 2, r: 3 });
  });

  it('queen combines rook and bishop rays', () => {
    const hits = computeAttacks({ type: 'queen', c: 2, r: 2, occupied: new Set() });
    expect(hits).toContainEqual({ c: 3, r: 3 });
    expect(hits).toContainEqual({ c: 3, r: 2 });
    expect(hits).toContainEqual({ c: 2, r: 3 });
  });

  it('knight jumps in L-shapes, ignoring occupied cells', () => {
    const occupied = new Set(['3,4']);
    const hits = computeAttacks({ type: 'knight', c: 2, r: 2, occupied });
    expect(hits).toContainEqual({ c: 3, r: 4 }); // hit even though "occupied"
    expect(hits.length).toBe(8);
  });

  it('king attacks all 8 neighbours, unblockable', () => {
    const hits = computeAttacks({ type: 'king', c: 2, r: 2, occupied: new Set(['3,2']) });
    expect(hits.length).toBe(8);
    expect(hits).toContainEqual({ c: 3, r: 2 });
  });

  it('king near the edge only attacks in-bounds neighbours', () => {
    const hits = computeAttacks({ type: 'king', c: 0, r: 0, occupied: new Set() });
    expect(hits.length).toBe(3);
  });

  it('pawn (up) attacks only its two forward diagonals, never straight ahead', () => {
    const hits = computeAttacks({ type: 'pawn', c: 2, r: 2, pawnDirection: 'up', occupied: new Set() });
    expect(hits).toEqual(expect.arrayContaining([{ c: 1, r: 1 }, { c: 3, r: 1 }]));
    expect(hits).not.toContainEqual({ c: 2, r: 1 });
    expect(hits.length).toBe(2);
  });

  it('pawn (down) attacks the opposite forward diagonals', () => {
    const hits = computeAttacks({ type: 'pawn', c: 2, r: 2, pawnDirection: 'down', occupied: new Set() });
    expect(hits).toEqual(expect.arrayContaining([{ c: 1, r: 3 }, { c: 3, r: 3 }]));
  });

  it('pawn is never blocked by an occupied diagonal cell', () => {
    const occupied = new Set(['1,1']);
    const hits = computeAttacks({ type: 'pawn', c: 2, r: 2, pawnDirection: 'up', occupied });
    expect(hits).toContainEqual({ c: 1, r: 1 });
  });
});
