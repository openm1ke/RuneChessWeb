import { useMemo, type PointerEvent, type ReactElement, type RefObject } from 'react';
import type { DozorEngine, DozorSnapshot } from '../../game/dozorEngine';
import { cellKey, type Beam, type Cell, type Piece } from '../../game/models';
import { pieceOnBoardSize, pieceSkins, type PieceType } from '../../game/pieceTypes';
import { useCosmeticSkin } from '../../game/cosmeticSkinContext';
import { coinAsset, uprightRotationOf } from '../../game/cosmeticSkins';
import { BoardPerspective, BOARD_LEFT, BOARD_TOP } from './boardPerspective';
import { PieceArt } from './PieceArt';
import type { DragController } from './useDragController';
import { playPieceSet } from '../../services/musicService';

/** How far past the playing field the frame layer is allowed to reach:
 * enough for the gems and corner work that lean in, and nowhere near the
 * screen's own controls. */
const BOARD_FRAME_MARGIN = 36;

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
  const skin = useCosmeticSkin();
  const boardSize = snapshot.boardSize;
  const cells: ReactElement[] = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const corners = BoardPerspective.cellCorners(c, r, boardSize);
      const isSolution = snapshot.solutionCell?.c === c && snapshot.solutionCell?.r === r;
      cells.push(
        <polygon
          key={`cell-${c}-${r}`}
          points={polygonPoints(corners)}
          fill={(r + c) % 2 === 0 ? skin.lightCell : skin.darkCell}
          stroke={isSolution ? 'rgba(249,216,104,0.6)' : 'rgba(255,255,255,0.10)'}
          strokeWidth={isSolution ? 2.5 : 1.1}
        />,
      );
    }
  }

  const beams = snapshot.beams.map((beam, index) => <BeamPath key={index} beam={beam} beamPhase={beamPhase} />);

  // What the figure being dragged would strike from the cell under the
  // pointer: every square it reaches, tinted in its own colour, then its
  // beams to the coins. Drawn under the real beams so a preview never reads
  // as an actual, committed hit.
  const previewSkin = snapshot.previewType ? pieceSkins[snapshot.previewType] : null;
  const preview = previewSkin && (
    <g>
      {snapshot.previewCells.map((cell) => (
        <polygon
          key={`preview-${cell.c}-${cell.r}`}
          points={polygonPoints(BoardPerspective.cellCorners(cell.c, cell.r, boardSize))}
          fill={previewSkin.color}
          fillOpacity={0.26}
        />
      ))}
      {snapshot.previewCell && (
        <polygon
          points={polygonPoints(
            BoardPerspective.cellCorners(snapshot.previewCell.c, snapshot.previewCell.r, boardSize),
          )}
          fill="none"
          stroke={previewSkin.color}
          strokeOpacity={0.85}
          strokeWidth={2.5}
        />
      )}
      {snapshot.previewBeams.map((beam, index) => (
        <BeamPath key={`preview-beam-${index}`} beam={beam} beamPhase={beamPhase} />
      ))}
    </g>
  );

  const outline = BoardPerspective.outlinePoints();

  return (
    <svg
      width={BoardPerspective.width}
      height={BoardPerspective.height}
      viewBox={`0 0 ${BoardPerspective.width} ${BoardPerspective.height}`}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
    >
      {cells}
      {preview}
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

function BeaconCoin({ beacon, done, cellPx }: { beacon: Cell & { target: number }; done: boolean; cellPx: number }) {
  const skin = useCosmeticSkin();
  const source = { x: (beacon.c + 0.5) * cellPx, y: (beacon.r + 0.5) * cellPx };
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
        // Establishes a stacking context of its own so the inner zIndex:1
        // below (coin above its own aura) stays scoped to this wrapper.
        // Without this, that zIndex leaks past an unpositioned parent into
        // the shared board stacking context and beats every piece's own
        // (unset/auto) zIndex outright — coins would render on top of every
        // piece regardless of row, no matter what DOM order they're drawn in.
        zIndex: 0,
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
          src={coinAsset(skin, beacon.target)}
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
  const skin = useCosmeticSkin();
  const rect = pieceScreenRect(piece, piece.type, cellPx);
  return (
    <div
      style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerDown={(e) => onDragStart(piece, e)}
      onClick={() => engine.tapPiece(piece.id)}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* A set carved from one material has no colour of its own to tell a
            rook from a bishop, and its figures are as dark as the squares
            they stand on. This puts both back: the type's colour, and enough
            separation to see the silhouette against the board. */}
        {skin.pieceAmbientGlow > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 3 * rect.scale,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 40 * rect.scale,
              height: 46 * rect.scale,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: `radial-gradient(circle, ${pieceSkins[piece.type].color}${Math.round(
                skin.pieceAmbientGlow * 255,
              )
                .toString(16)
                .padStart(2, '0')} 0%, transparent 70%)`,
            }}
          />
        )}
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
            transform: `translateX(-50%) rotate(${uprightRotationOf(skin, piece.type)}deg)`,
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
  const skin = useCosmeticSkin();
  const scaleX = scale;
  const effectiveScaleY = scaleY ?? scale;
  // A set with wide landscape art places its table by that art's own
  // numbers, not by the board's, so a portrait frame layer would land in the
  // wrong place — such a set needs a wide layer of its own before this can
  // be shown.
  const boardFrame =
    scaleY !== undefined && skin.wideBoardAsset ? null : skin.boardFrameAsset;
  const cellAt = (clientX: number, clientY: number): Cell | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    // The board renders at design-space size but may be visually scaled by
    // the outer DesignCanvas transform; convert client px back to design px.
    const scaleX = BoardPerspective.width / rect.width;
    const scaleY = BoardPerspective.height / rect.height;
    return BoardPerspective.unprojectCell(
      {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      },
      snapshot.boardSize,
    );
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
        if (!cell) return;
        const before = engine.moveCount;
        engine.tapCell(cell.c, cell.r);
        if (engine.moveCount > before) playPieceSet();
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
        {/* The frame's own gems and corner work lean in over the playing
            surface; the squares are drawn over the table, so without this
            they slice those bits off along the edge. Above the squares and
            below the figures, which is where a piece standing at the near
            rail already looked right. Placed by the same offset the table
            itself is: the board sits at (BOARD_LEFT, BOARD_TOP) of the
            430×764 art, so this box rides every scale the board rides. */}
        {boardFrame && (
          <div
            style={{
              position: 'absolute',
              left: -BOARD_FRAME_MARGIN,
              top: -BOARD_FRAME_MARGIN,
              width: BoardPerspective.width + BOARD_FRAME_MARGIN * 2,
              height: BoardPerspective.height + BOARD_FRAME_MARGIN * 2,
              // Everything this layer has to say is within a few pixels of
              // the field's edge; the rest of it is table the backdrop
              // already drew. Clipped to that neighbourhood so it cannot
              // reach the screen's own furniture — the back and hint
              // buttons are declared before the board, and an unclipped
              // layer painted straight over them.
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <img
              src={boardFrame}
              alt=""
              style={{
                position: 'absolute',
                left: BOARD_FRAME_MARGIN - BOARD_LEFT,
                top: BOARD_FRAME_MARGIN - BOARD_TOP,
                width: 430,
                height: 764,
                objectFit: 'fill',
              }}
              draggable={false}
            />
          </div>
        )}
        {snapshot.beacons.map((beacon) => (
          <BeaconCoin
            key={cellKey(beacon.c, beacon.r)}
            beacon={beacon}
            done={(snapshot.counts[cellKey(beacon.c, beacon.r)] ?? 0) === beacon.target}
            cellPx={snapshot.cellPx}
          />
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
