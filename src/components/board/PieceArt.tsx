import type { CSSProperties } from 'react';
import { type PawnDirection, type PieceType } from '../../game/pieceTypes';
import { useCosmeticSkin } from '../../game/cosmeticSkinContext';

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
  const skin = useCosmeticSkin();
  return (
    <img
      src={skin.pieceAssets[type]}
      alt={type}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain', display: 'block', ...style }}
      draggable={false}
    />
  );
}
