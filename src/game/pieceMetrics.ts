/**
 * How big a figure is drawn, in one place, for the board and the tray alike.
 *
 * It used to be two hand-tuned tables and a scatter of multipliers: a size
 * per type for the board (times 1.42 wide, 1.28 tall, times 1.14 — 1.25 for
 * the bishop), a second size for the tray that nothing actually used because
 * the tray stretched every sprite to its tile, and a nudge for the queen and
 * the pawn whose canvases carry more air than the rest. Three things went
 * wrong with that:
 *
 * - the same figure came out one size in the tray and another on the board,
 *   and in the tray every type was the same height, so a pawn stood as tall
 *   as a king;
 * - nothing was tied to the square it stands on, so the 7×7 levels drew the
 *   same figure as the 6×6 ones on a square a seventh smaller — that is the
 *   figure spilling out of its cell;
 * - the sprite canvases are not the figures. The queen's canvas is 8% air
 *   top and bottom, so sizing by the canvas drew her short and left her feet
 *   hovering — which is what the per-type nudge was patching over.
 *
 * So: the figure's *content* (measured, not guessed — see
 * `tool/measure_piece_metrics.py` in the Flutter repo) is given a height in
 * cell heights, and everything else follows from the board's own geometry.
 * Mirrors the Flutter app's `PieceMetrics`.
 */
import type { PieceType } from './pieceTypes';

/** Canvas each set's prepared sprite is drawn on — identical across sets,
 * which is what `tool/prepare_cosmetics.py` normalises them for. */
const canvas: Record<PieceType, { width: number; height: number }> = {
  rook: { width: 230, height: 377 },
  bishop: { width: 201, height: 349 },
  knight: { width: 207, height: 357 },
  king: { width: 200, height: 400 },
  queen: { width: 323, height: 512 },
  pawn: { width: 330, height: 512 },
};

/**
 * Where the figure actually is inside that canvas, as fractions of it. The
 * canvases carry different amounts of air at the sides — the queen's most of
 * all, and more since she was redrawn slimmer — so the sprite's own width
 * says little about how wide the figure standing on the square is.
 */
const content: Record<
  PieceType,
  { top: number; bottom: number; left: number; right: number }
> = {
  rook: { top: 0.013, bottom: 0.995, left: 0.011, right: 0.988 },
  bishop: { top: 0.008, bottom: 0.995, left: 0.015, right: 0.984 },
  knight: { top: 0.011, bottom: 0.995, left: 0.012, right: 0.987 },
  king: { top: 0.005, bottom: 0.996, left: 0.031, right: 0.966 },
  queen: { top: 0.040, bottom: 0.960, left: 0.130, right: 0.866 },
  pawn: { top: 0.040, bottom: 0.963, left: 0.056, right: 0.942 },
};

/**
 * How tall each figure is next to the tallest of them. These are the
 * proportions the pieces were drawn in and have always had on the board;
 * only their absolute size is decided elsewhere.
 */
const figureRatio: Record<PieceType, number> = {
  rook: 0.931,
  bishop: 0.951,
  knight: 0.884,
  king: 1,
  // The queen is deliberately a touch taller than the king: her slimmer
  // silhouette and crown need that presence to read as the board's most
  // powerful figure rather than as a shortened bishop.
  queen: 1.08,
  pawn: 0.786,
};

/**
 * The tallest figure's height, in cell heights, on the row nearest the
 * player. One number decides how big every figure is everywhere.
 *
 * A standing figure is taller than the square it stands on — that is what
 * standing looks like from in front and above — so this is above 1. What it
 * must never do is spill *sideways* onto a neighbouring square, and at this
 * height no figure is anywhere near as wide as a cell (the widest, the
 * queen, comes to about two thirds of one). At exactly 1 the pieces read as
 * small counters rather than figures; the board looked like a draughts set.
 */
export const TALLEST_FIGURE_IN_CELLS = 1.4;

/** The board's depth scale, near row over far row — see `BoardPerspective`. */
export const NEAREST_DEPTH = 1.12;

/** How far below the square's projected centre a figure's feet sit. Squares
 * are drawn as if seen from in front and above, so a figure standing in the
 * middle of one has its base a little below that middle. */
export const FOOT_DROP_IN_CELLS = 0.19;

export interface PieceDrawBox {
  /** The sprite's own box — canvas, not figure. */
  width: number;
  height: number;
  /** Distance from the sprite's bottom edge up to the figure's feet. */
  footInset: number;
}

/**
 * The sprite box to draw so that the figure inside it is the right height
 * for a square `cellHeight` tall, at depth `depth` (1 = the board's far row).
 */
/**
 * How tall the figure itself is on a square `cellHeight` tall, at `depth` —
 * the number every rule here is actually about.
 */
export function pieceFigureHeight(
  type: PieceType,
  cellHeight: number,
  depth = 1,
): number {
  return (
    (figureRatio[type] * TALLEST_FIGURE_IN_CELLS * cellHeight * depth) / NEAREST_DEPTH
  );
}

/**
 * How wide the figure itself is — the number the "never reaches its
 * neighbour" rule is actually about. The sprite box around it is wider, by
 * however much air its canvas carries.
 */
export function pieceFigureWidth(
  type: PieceType,
  cellHeight: number,
  depth = 1,
): number {
  const box = content[type];
  const width = (box.right - box.left) * canvas[type].width;
  const height = (box.bottom - box.top) * canvas[type].height;
  return (pieceFigureHeight(type, cellHeight, depth) * width) / height;
}

export function pieceDrawBox(
  type: PieceType,
  cellHeight: number,
  depth = 1,
): PieceDrawBox {
  const box = content[type];
  const height = pieceFigureHeight(type, cellHeight, depth) / (box.bottom - box.top);
  return {
    width: (height * canvas[type].width) / canvas[type].height,
    height,
    footInset: (1 - box.bottom) * height,
  };
}

/**
 * The square a tray tile stands in for: the tile itself, so the tallest
 * figure fills it and the rest keep their proportions to it. The tray is a
 * display case, not a square on the board — a figure is shown there at its
 * best size, and only the board is bound by the cell.
 */
export function cellHeightForTile(height: number): number {
  return (height * NEAREST_DEPTH) / TALLEST_FIGURE_IN_CELLS;
}
