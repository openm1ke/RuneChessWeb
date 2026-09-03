import type { Cell } from './models';
import { cellKey } from './models';
import type { PawnDirection, PieceType } from './pieceTypes';

/** Default board side — the original campaign's 6×6 board. The bonus
 * campaign's 7×7 levels pass their own `boardN` explicitly wherever it
 * matters (see `LevelDefinition.boardSize`). */
export const BOARD_N = 6;

export const isInBounds = (c: number, r: number, boardN: number = BOARD_N): boolean =>
  c >= 0 && c < boardN && r >= 0 && r < boardN;

const ROOK_RAY_DELTAS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_RAY_DELTAS: readonly [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const QUEEN_RAY_DELTAS: readonly [number, number][] = [
  ...ROOK_RAY_DELTAS,
  ...BISHOP_RAY_DELTAS,
];
const KNIGHT_DELTAS: readonly [number, number][] = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

/**
 * The straight-line ray directions for a given piece type, or an empty list
 * for piece types that don't attack along rays (knight/king/pawn). Shared by
 * both `computeAttacks` and the beam renderer so they can never disagree on
 * which way a rook, bishop or queen shoots.
 */
export function rayDeltasFor(type: PieceType): readonly [number, number][] {
  switch (type) {
    case 'rook':
      return ROOK_RAY_DELTAS;
    case 'bishop':
      return BISHOP_RAY_DELTAS;
    case 'queen':
      return QUEEN_RAY_DELTAS;
    default:
      return [];
  }
}

export interface ComputeAttacksArgs {
  type: PieceType;
  c: number;
  r: number;
  pawnDirection?: PawnDirection;
  occupied: ReadonlySet<string>;
  boardN?: number;
}

/**
 * Single source of truth for every piece type's attack pattern:
 * - rook/bishop/queen shoot rays, stopping at (and including) the first
 *   occupied cell;
 * - knight jumps to its eight L-shaped cells, ignoring `occupied` entirely;
 * - king attacks its eight neighbours, also unblockable;
 * - pawn attacks its two forward diagonals (per `pawnDirection`), never the
 *   cell directly ahead, and is likewise never blocked.
 */
export function computeAttacks({
  type,
  c,
  r,
  pawnDirection,
  occupied,
  boardN = BOARD_N,
}: ComputeAttacksArgs): Cell[] {
  const out: Cell[] = [];
  switch (type) {
    case 'knight':
      for (const [dc, dr] of KNIGHT_DELTAS) {
        const cell = { c: c + dc, r: r + dr };
        if (isInBounds(cell.c, cell.r, boardN)) out.push(cell);
      }
      break;
    case 'king':
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if ((dc !== 0 || dr !== 0) && isInBounds(c + dc, r + dr, boardN)) {
            out.push({ c: c + dc, r: r + dr });
          }
        }
      }
      break;
    case 'pawn': {
      const dr = pawnDirection === 'up' ? -1 : 1;
      for (const dc of [-1, 1]) {
        const cell = { c: c + dc, r: r + dr };
        if (isInBounds(cell.c, cell.r, boardN)) out.push(cell);
      }
      break;
    }
    case 'rook':
    case 'bishop':
    case 'queen':
      for (const [dc, dr] of rayDeltasFor(type)) {
        let cc = c + dc;
        let rr = r + dr;
        while (isInBounds(cc, rr, boardN)) {
          out.push({ c: cc, r: rr });
          if (occupied.has(cellKey(cc, rr))) break;
          cc += dc;
          rr += dr;
        }
      }
      break;
  }
  return out;
}
