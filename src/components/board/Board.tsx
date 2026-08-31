import { useMemo, type PointerEvent, type ReactElement, type RefObject } from 'react';
import type { DozorEngine, DozorSnapshot } from '../../game/dozorEngine';
import { BOARD_N } from '../../game/attackRules';
import { cellKey, type Beam, type Cell, type Piece } from '../../game/models';
import { pieceOnBoardSize, pieceSkins, type PieceType } from '../../game/pieceTypes';
import { BoardPerspective, BOARD_LEFT, BOARD_TOP } from './boardPerspective';
import { PieceArt } from './PieceArt';
import type { DragController } from './useDragController';
import { asset } from '../../lib/assetUrl';

const CELL_UNIT = BoardPerspective.sourceSize / BOARD_N;

function orderPiecesByBoardDepth(pieces: Piece[], heldId: string | null): Piece[] {
  const ordered = [...pieces];
  ordered.sort((a, b) => {
    if (a.id === heldId) return 1;
    if (b.id === heldId) return -1;
    const byRow = a.r - b.r;
    return byRow !== 0 ? byRow : a.c - b.c;
  });
  return ordered;
}

function polygonPoints(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/** SVG checkerboard + dashed attack-beam rendering, a port of `BoardPainter`. */
function BoardSvg({ snapshot, beamPhase }: { snapshot: DozorSnapshot; beamPhase: number }) {
  const cells: ReactElement[] = [];
  for (let r = 0; r < BOARD_N; r++) {
    for (let c = 0; c < BOARD_N; c++) {
      const corners = BoardPerspective.cellCorners(c, r);
      const isSolution = snapshot.solutionCell?.c === c && snapshot.solutionCell?.r === r;
      cells.push(
        <polygon
          key={`cell-${c}-${r}`}
          points={polygonPoints(corners)}
          fill={(r + c) % 2 === 0 ? '#dbc49a' : '#1d2c55'}
          stroke={isSolution ? 'rgba(249,216,104,0.6)' : 'rgba(255,255,255,0.10)'}
          strokeWidth={isSolution ? 2.5 : 1.1}
        />,
      );
    }
  }

  const beams = snapshot.beams.map((beam, index) => <BeamPath key={index} beam={beam} beamPhase={beamPhase} />);

  const outline = BoardPerspective.outlinePoints();

  return (
    <svg
      width={BoardPerspective.width}
      height={BoardPerspective.height}
      viewBox={`0 0 ${BoardPerspective.width} ${BoardPerspective.height}`}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
    >
      {cells}
      {beams}
      <polygon points={polygonPoints(outline)} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={4} />
    </svg>
  );
}

function BeamPath({ beam, beamPhase }: { beam: Beam; beamPhase: number }) {
  const projected = beam.points.map((p) => BoardPerspective.project({ x: p.dx, y: p.dy }));
  const sourceDepth = beam.points[0].dy / BoardPerspective.sourceSize;
  const sourceShift = -13 * (0.94 + 0.18 * sourceDepth);

  let d: string;
  if (projected.length === 2) {
    const [a, b] = projected;
    const a2 = { x: a.x, y: a.y + sourceShift };
    const b2 = { x: b.x, y: b.y + sourceShift };
    d = `M ${a2.x} ${a2.y} L ${b2.x} ${b2.y}`;
  } else {
    const [a, m, b] = projected;
    const a2 = { x: a.x, y: a.y + sourceShift };
    const m2 = { x: m.x, y: m.y + sourceShift * 0.35 };
    d = `M ${a2.x} ${a2.y} Q ${m2.x} ${m2.y} ${b.x} ${b.y}`;
  }

  const skin = pieceSkins[beam.type];
  const dash = 8;
  const gap = 6;
  const dashOffset = -beamPhase * (dash + gap);

  return (
    <g>
      <path d={d} stroke={skin.glow} strokeOpacity={0.08} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path
        d={d}
        stroke={skin.glow}
        strokeOpacity={0.22}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={dashOffset}
      />
      <path
        d={d}
        stroke={skin.color}
        strokeOpacity={0.82}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={dashOffset}
      />
      <path
        d={d}
        stroke="#fff"
        strokeOpacity={0.22}
        strokeWidth={0.75}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={dashOffset}
      />
    </g>
  );
}

function BeaconCoin({ beacon, done }: { beacon: Cell & { target: number }; done: boolean }) {
  const source = { x: (beacon.c + 0.5) * CELL_UNIT, y: (beacon.r + 0.5) * CELL_UNIT };
  const center = BoardPerspective.project(source);
  const scale = 0.88 + (0.16 * source.y) / BoardPerspective.sourceSize;
  const size = 46 * scale;
  return (
    <div
      style={{
        position: 'absolute',
        left: center.x - size / 2,
        top: center.y - size * 0.56,
        width: size,
        height: size,
        pointerEvents: 'none',
      }}
    >
      {done && <ActivatedBeaconAura />}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          transition: 'transform 260ms cubic-bezier(0.33,1,0.68,1)',
          transform: done ? 'translateY(-11.5%) scale(1.045)' : 'none',
        }}
      >
        <img
          src={asset(`assets/images/coin-${beacon.target}.webp`)}
          width={size}
          height={size}
          alt={`${beacon.target}`}
          style={{ display: 'block' }}
          draggable={false}
        />
      </div>
    </div>
  );
}

const beaconSparkles = [
  { left: '17%', delay: '0s', travel: '19px', size: '5px' },
  { left: '83%', delay: '-1.18s', travel: '17px', size: '6px' },
  { left: '29%', delay: '-0.89s', travel: '14px', size: '5px' },
  { left: '71%', delay: '-0.61s', travel: '18px', size: '6px' },
  { left: '39%', delay: '-0.33s', travel: '13px', size: '4px' },
];

/** The aura is grounded on the cell while only the coin art lifts above it. */
function ActivatedBeaconAura() {
  return (
    <div className="beacon-activation-aura" aria-hidden="true">
      {beaconSparkles.map((sparkle, index) => (
        <span
          key={index}
          className="beacon-activation-spark"
          style={{
            left: sparkle.left,
            animationDelay: sparkle.delay,
            '--sparkle-travel': sparkle.travel,
            '--sparkle-size': sparkle.size,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function pieceScreenRect(piece: Cell, type: PieceType, cellPx: number) {
  const dims = pieceOnBoardSize[type];
  const spriteScale = type === 'bishop' ? 1.25 : 1.14;
  const cellAnchorOffset = type === 'queen' ? 3.6 : type === 'pawn' ? 3.2 : 0;
  const source = { x: piece.c * cellPx + cellPx / 2, y: piece.r * cellPx + cellPx / 2 };
  const center = BoardPerspective.project(source);
  const scale = 0.94 + (0.18 * source.y) / BoardPerspective.sourceSize;
  const artWidth = dims.width * 1.42 * spriteScale * scale;
  const artHeight = dims.height * 1.28 * spriteScale * scale;
  return {
    left: center.x - 30 * scale,
    top: center.y - 58 * scale + cellAnchorOffset * scale,
    width: 60 * scale,
    height: 68 * scale,
    artWidth,
    artHeight,
    scale,
  };
}

function PieceOnBoard({
  piece,
  engine,
  cellPx,
  isHeld,
  onDragStart,
}: {
  piece: Piece;
  engine: DozorEngine;
  cellPx: number;
  isHeld: boolean;
  onDragStart: (piece: Piece, event: PointerEvent) => void;
}) {
  const rect = pieceScreenRect(piece, piece.type, cellPx);
  return (
    <div
      style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerDown={(e) => onDragStart(piece, e)}
      onClick={() => engine.tapPiece(piece.id)}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {isHeld && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 46 * rect.scale,
              height: 20 * rect.scale,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${pieceSkins[piece.type].glow} 0%, transparent 100%)`,
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 2 * rect.scale,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 39 * rect.scale,
            height: 14 * rect.scale,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.53) 0%, transparent 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: isHeld ? '14%' : 0,
            left: '50%',
            transition: 'bottom 180ms cubic-bezier(0.33,1,0.68,1)',
            transform: `translateX(-50%) rotate(${piece.type === 'king' ? -4.3 : 0}deg)`,
            transformOrigin: 'bottom center',
          }}
        >
          <PieceArt type={piece.type} width={rect.artWidth} height={rect.artHeight} />
        </div>
      </div>
    </div>
  );
}

function HintGhost({
  item,
  cell,
  cellPx,
}: {
  item: { type: PieceType };
  cell: Cell;
  cellPx: number;
}) {
  const rect = pieceScreenRect(cell, item.type, cellPx);
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        opacity: 0.48,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          filter:
            'brightness(0) saturate(100%) invert(85%) sepia(28%) saturate(722%) hue-rotate(139deg) brightness(101%) contrast(96%)',
        }}
      >
        <PieceArt type={item.type} width={rect.artWidth} height={rect.artHeight} />
      </div>
    </div>
  );
}

export function Board({
  engine,
  snapshot,
  beamPhase,
  drag,
  boardRef,
  boardLeft = BOARD_LEFT,
  boardTop = BOARD_TOP,
  scale = 1,
  scaleY,
}: {
  engine: DozorEngine;
  snapshot: DozorSnapshot;
  beamPhase: number;
  drag: DragController;
  boardRef: RefObject<HTMLDivElement>;
  /** Landscape mode positions/scales the board differently than portrait. */
  boardLeft?: number;
  boardTop?: number;
  /** Horizontal scale factor (also the vertical one when `scaleY` is omitted). */
  scale?: number;
  /** Independent vertical scale factor, so the board can stretch to fill a
   * frame whose aspect ratio doesn't quite match the board's own. */
  scaleY?: number;
}) {
  const scaleX = scale;
  const effectiveScaleY = scaleY ?? scale;
  const cellAt = (clientX: number, clientY: number): Cell | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    // The board renders at design-space size but may be visually scaled by
    // the outer DesignCanvas transform; convert client px back to design px.
    const scaleX = BoardPerspective.width / rect.width;
    const scaleY = BoardPerspective.height / rect.height;
    return BoardPerspective.unprojectCell({
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    });
  };

  const orderedPieces = useMemo(
    () => orderPiecesByBoardDepth(snapshot.pieces, snapshot.held),
    [snapshot.pieces, snapshot.held],
  );

  return (
    <div
      ref={boardRef}
      style={{
        position: 'absolute',
        left: boardLeft,
        top: boardTop,
        width: BoardPerspective.width * scaleX,
        height: BoardPerspective.height * effectiveScaleY,
        overflow: 'visible',
      }}
      onClick={(e) => {
        const cell = cellAt(e.clientX, e.clientY);
        if (cell) engine.tapCell(cell.c, cell.r);
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: BoardPerspective.width,
          height: BoardPerspective.height,
          transform:
            scaleX === 1 && effectiveScaleY === 1 ? undefined : `scale(${scaleX}, ${effectiveScaleY})`,
          transformOrigin: 'top left',
        }}
      >
        <BoardSvg snapshot={snapshot} beamPhase={beamPhase} />
        {snapshot.beacons.map((beacon) => (
          <BeaconCoin key={cellKey(beacon.c, beacon.r)} beacon={beacon} done={snapshot.counts[cellKey(beacon.c, beacon.r)] === beacon.target} />
        ))}
        {snapshot.solutionCell && snapshot.hintItem && (
          <HintGhost item={snapshot.hintItem} cell={snapshot.solutionCell} cellPx={snapshot.cellPx} />
        )}
        {orderedPieces.map((piece) => (
          <PieceOnBoard
            key={piece.id}
            piece={piece}
            engine={engine}
            cellPx={snapshot.cellPx}
            isHeld={piece.id === snapshot.held}
            onDragStart={(p, e) => drag.startFromBoard(p, e)}
          />
        ))}
      </div>
      {drag.feedback}
    </div>
  );
}

export { BoardPerspective };
