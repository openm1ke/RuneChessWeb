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

/**
 * What each figure is called, and how it strikes — one line each, mirroring
 * the mobile app's `pieceNames`/`pieceAttackSummary`.
 *
 * The tray used to show six silhouettes and no names, so a player who does
 * not know chess had no way to tell a bishop from a pawn; the rules are a
 * separate page, which is a page too far mid-puzzle.
 */
export const pieceNames: Record<PieceType, string> = {
  rook: 'Ладья',
  bishop: 'Слон',
  knight: 'Конь',
  king: 'Король',
  queen: 'Ферзь',
  pawn: 'Пешка',
};

/** Where each figure strikes, phrased to follow either its name ("Ладья ·
 * по горизонтали и вертикали") or the verb ("Ладья, бьёт по горизонтали и
 * вертикали"). Kept short because the tray's header line is 218px wide. */
export const pieceAttackSummary: Record<PieceType, string> = {
  rook: 'По горизонтали и вертикали',
  bishop: 'По диагоналям',
  knight: 'Буквой «Г»',
  king: 'Вокруг себя на одну клетку',
  queen: 'По прямым и диагоналям',
  pawn: 'По диагонали вперёд',
};
