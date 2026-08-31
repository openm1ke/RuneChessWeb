import type { PawnDirection, PieceType } from './pieceTypes';

/** A piece placed on the 6x6 board. */
export interface Piece {
  id: string;
  type: PieceType;
  c: number;
  r: number;
  pawnDirection?: PawnDirection;
}

/** An unplaced piece waiting in the bottom tray. */
export interface TrayItem {
  id: string;
  type: PieceType;
  pawnDirection?: PawnDirection;
}

/** A fixed beacon cell with the exact number of attacks it must receive. */
export interface Beacon {
  c: number;
  r: number;
  target: number;
}

/** A cell coordinate. */
export interface Cell {
  c: number;
  r: number;
}

export const cellKey = (c: number, r: number): string => `${c},${r}`;
export const cellsEqual = (a: Cell | null | undefined, b: Cell | null | undefined): boolean =>
  !!a && !!b && a.c === b.c && a.r === b.r;

export interface Offset2 {
  dx: number;
  dy: number;
}

/** A single attack beam drawn from a piece to a satisfied beacon. */
export interface Beam {
  points: Offset2[];
  type: PieceType;
}

export interface LevelDefinition {
  beacons: Beacon[];
  tray: TrayItem[];
}
