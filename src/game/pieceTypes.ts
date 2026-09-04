import { asset } from '../lib/assetUrl';

/** Chess-piece types used by the puzzle, mirrors `PieceType` in the Flutter app. */
export type PieceType = 'rook' | 'bishop' | 'knight' | 'king' | 'queen' | 'pawn';

export const ALL_PIECE_TYPES: readonly PieceType[] = [
  'rook',
  'bishop',
  'knight',
  'king',
  'queen',
  'pawn',
];

/** Forward-attack direction for a pawn. A pawn only ever attacks its two
 * forward diagonals towards smaller row indices (the top of the board) —
 * never backward or sideways — so `up` is the only value. */
export type PawnDirection = 'up';

export interface PieceSkin {
  color: string;
  glow: string;
}

export const pieceSkins: Record<PieceType, PieceSkin> = {
  rook: { color: '#5AA9FF', glow: 'rgba(90,169,255,0.95)' },
  bishop: { color: '#B98CFF', glow: 'rgba(185,140,255,0.95)' },
  knight: { color: '#FF9B3D', glow: 'rgba(255,155,61,0.95)' },
  king: { color: '#4FE3D4', glow: 'rgba(79,227,212,0.95)' },
  queen: { color: '#E84B72', glow: 'rgba(232,75,114,0.95)' },
  pawn: { color: '#63C978', glow: 'rgba(99,201,120,0.95)' },
};

/** A few sprites aren't drawn perfectly upright in the source art — this
 * corrects each one in place (applied on top of the piece's own upright
 * pose, both on the board and in the tray). Zero for every type not listed
 * here. */
export const pieceUprightRotationDeg: Partial<Record<PieceType, number>> = {
  king: -6.5,
  rook: 4,
};

/** Dedicated sprite art for every piece type. */
export const pieceAsset: Record<PieceType, string> = {
  rook: asset('assets/images/p-rook-android.webp'),
  bishop: asset('assets/images/p-bishop-android.webp'),
  knight: asset('assets/images/p-knight-android.webp'),
  king: asset('assets/images/p-king-android.webp'),
  queen: asset('assets/images/p-queen-android.webp'),
  pawn: asset('assets/images/p-pawn-android.webp'),
};

export interface SpriteSize {
  width: number;
  height: number;
}

/** On-board sprite size for each piece type (design px). */
export const pieceOnBoardSize: Record<PieceType, SpriteSize> = {
  rook: { width: 25.7, height: 42.1 },
  bishop: { width: 22.5, height: 39.0 },
  knight: { width: 23.1, height: 39.9 },
  king: { width: 22.4, height: 44.8 },
  queen: { width: 27.0, height: 48.2 },
  pawn: { width: 22.0, height: 38.0 },
};

/** Tray sprite size for each piece type (design px). */
export const pieceTraySize: Record<PieceType, SpriteSize> = {
  rook: { width: 31.3, height: 51.3 },
  bishop: { width: 27.4, height: 47.5 },
  knight: { width: 28.2, height: 48.6 },
  king: { width: 27.3, height: 54.5 },
  queen: { width: 32.8, height: 58.4 },
  pawn: { width: 26.0, height: 43.0 },
};
