import { BOARD_N } from '../../game/attackRules';
import type { Cell } from '../../game/models';

/**
 * Isometric projection of the board — a direct port of `BoardPerspective`
 * from `board.dart`. The board's top edge is narrower than its bottom edge,
 * simulating a table viewed from slightly above. The trapezoid frame itself
 * (`sourceSize`/`width`/`height`/corners) is fixed regardless of board
 * size — only `cellCorners`/`unprojectCell`'s `boardN` param changes how
 * many (smaller) cells are packed into that same frame, e.g. for the bonus
 * campaign's 7×7 boards.
 */
export const BoardPerspective = {
  sourceSize: 292.0,
  width: 362.0,
  height: 307.0,
  topLeft: 32.0,
  topRight: 330.0,
  bottomLeft: 12.0,
  bottomRight: 350.0,

  leftAt(v: number): number {
    return this.topLeft + (this.bottomLeft - this.topLeft) * v;
  },
  rightAt(v: number): number {
    return this.topRight + (this.bottomRight - this.topRight) * v;
  },

  project(point: { x: number; y: number }): { x: number; y: number } {
    const v = Math.min(1, Math.max(0, point.y / this.sourceSize));
    const left = this.leftAt(v);
    const right = this.rightAt(v);
    return { x: left + (right - left) * (point.x / this.sourceSize), y: this.height * v };
  },

  cellCorners(c: number, r: number, boardN: number = BOARD_N): { x: number; y: number }[] {
    const unit = this.sourceSize / boardN;
    const a = this.project({ x: c * unit, y: r * unit });
    const b = this.project({ x: (c + 1) * unit, y: r * unit });
    const d = this.project({ x: c * unit, y: (r + 1) * unit });
    const e = this.project({ x: (c + 1) * unit, y: (r + 1) * unit });
    return [a, b, e, d];
  },

  unprojectCell(point: { x: number; y: number }, boardN: number = BOARD_N): Cell | null {
    const v = point.y / this.height;
    if (v < 0 || v > 1) return null;
    const left = this.leftAt(v);
    const right = this.rightAt(v);
    const u = (point.x - left) / (right - left);
    if (u < 0 || u > 1) return null;
    return {
      c: Math.min(boardN - 1, Math.floor(u * boardN)),
      r: Math.min(boardN - 1, Math.floor(v * boardN)),
    };
  },

  outlinePoints(): { x: number; y: number }[] {
    return [
      { x: this.topLeft, y: 0 },
      { x: this.topRight, y: 0 },
      { x: this.bottomRight, y: this.height },
      { x: this.bottomLeft, y: this.height },
    ];
  },
};

/** Board's own position within the 430x932 design canvas. */
export const BOARD_LEFT = 34;
export const BOARD_TOP = 250;
