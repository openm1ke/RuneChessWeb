// A figure has to be the same figure wherever it is drawn: the same size in
// the tray as on the board, the same proportions between types in both, and
// never taller than the square it stands on — including on the 7×7 levels,
// where the squares are a seventh smaller and the figures used to stay put.
// Mirrors the mobile app's `test/piece_metrics_test.dart`.
import { describe, expect, it } from 'vitest';

import {
  NEAREST_DEPTH,
  TALLEST_FIGURE_IN_CELLS,
  cellHeightForTile,
  pieceFigureHeight,
  pieceFigureWidth,
  pieceDrawBox,
} from '../game/pieceMetrics';
import { ALL_PIECE_TYPES } from '../game/pieceTypes';

const CELL = 51.17; // a 6x6 board's square, on the design canvas

describe('figure geometry', () => {
  it('never spills sideways onto the next square', () => {
    // A standing figure is taller than its square; what it must never be is
    // wider than one, which is when it starts covering its neighbours.
    const cellWidth = 298 / 6;
    for (const type of ALL_PIECE_TYPES) {
      expect(pieceFigureWidth(type, CELL, NEAREST_DEPTH), type).toBeLessThan(
        cellWidth,
      );
    }
  });

  it('keeps the pieces in proportion to each other', () => {
    const king = pieceFigureHeight('king', CELL, NEAREST_DEPTH);
    expect(king).toBeCloseTo(CELL * TALLEST_FIGURE_IN_CELLS, 1);
    // A pawn is a smaller piece and has to read as one — in every place it
    // is drawn, which is what the tray was getting wrong.
    expect(pieceFigureHeight('pawn', CELL, NEAREST_DEPTH) / king).toBeCloseTo(0.786, 2);
  });

  it('draws smaller figures on a smaller board', () => {
    const smaller = 307 / 7;
    for (const type of ALL_PIECE_TYPES) {
      expect(
        pieceFigureWidth(type, smaller, NEAREST_DEPTH),
        type,
      ).toBeLessThan(298 / 7);
      expect(
        pieceFigureHeight(type, smaller) / pieceFigureHeight(type, CELL),
      ).toBeCloseTo(smaller / CELL, 3);
    }
  });

  it('fills a tray tile, in the same proportions the board uses', () => {
    // The tray is a display case, not a square: the tallest figure fills
    // the tile, and the rest keep their proportions to it.
    const tileHeight = 57;
    const unit = cellHeightForTile(tileHeight);
    expect(pieceFigureHeight('king', unit)).toBeCloseTo(tileHeight, 5);
    for (const type of ALL_PIECE_TYPES) {
      expect(
        pieceFigureHeight(type, unit) / pieceFigureHeight('king', unit),
        type,
      ).toBeCloseTo(
        pieceFigureHeight(type, CELL) / pieceFigureHeight('king', CELL),
        5,
      );
    }
  });
  it('draws the queen taller than the tile that fits the king', () => {
    // Not a defect to fix here, but the reason the tray tile clamps its
    // sprite: `cellHeightForTile` sizes the tile for the king, and the queen
    // is deliberately 8% taller than him. Left unclamped, her crown came out
    // through the panel's frame and onto the caption above it — which is
    // what a `maxHeight` on the tray's `PieceArt` (and the app's `Image`
    // taking the tile's constraints) is there to prevent.
    const tileHeight = 57;
    const unit = cellHeightForTile(tileHeight);
    expect(pieceDrawBox('queen', unit).height).toBeGreaterThan(tileHeight);
    expect(pieceFigureHeight('queen', unit)).toBeGreaterThan(tileHeight);
  });
});
