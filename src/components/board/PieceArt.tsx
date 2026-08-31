import type { CSSProperties } from 'react';
import { pieceAsset, type PawnDirection, type PieceType } from '../../game/pieceTypes';

export function PieceArt({
  type,
  width,
  height,
  style,
  className,
}: {
  type: PieceType;
  width?: number;
  height?: number;
  pawnDirection?: PawnDirection;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <img
      src={pieceAsset[type]}
      alt={type}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain', display: 'block', ...style }}
      draggable={false}
    />
  );
}
