import type { DozorSnapshot } from '../../game/dozorEngine';
import type { Cell } from '../../game/models';
import { tutorialLine } from '../../game/tutorialScript';
import { FIRST_SCORED_LEVEL_INDEX } from '../../data/campaignLevels';
import { TRAY_PORTRAIT, trayTileCenter } from '../tray/trayGeometry';
import { BoardPerspective, BOARD_LEFT, BOARD_TOP } from '../board/boardPerspective';

/** `ready` and `reset` used to be here too. `reset` was never returned at
 * all, and `ready` could only appear behind the level-result overlay, which
 * covers the board the instant a level is solved — so its line ("нажмите
 * «ГОТОВО»") was both invisible and wrong: the button says «ПРОДОЛЖИТЬ». */
type Focus = 'place' | 'ray' | 'hint' | 'trial' | 'overflow';

/** Where the board and tray actually are on screen — portrait renders them
 * inside the fixed 430x932 design canvas (so these are design units that
 * ride along with that canvas's own CSS scale), landscape renders them at
 * real, independently-computed viewport pixels. Passing the live values in
 * lets the same coachmark point correctly at both. */
export interface CoachmarkLayout {
  isLandscape: boolean;
  canvasWidth: number;
  board: { left: number; top: number; scaleX: number; scaleY: number };
  tray: { left: number; top: number; width: number; height: number };
}

const DEFAULT_LAYOUT: CoachmarkLayout = {
  isLandscape: false,
  canvasWidth: 430,
  board: { left: BOARD_LEFT, top: BOARD_TOP, scaleX: 1, scaleY: 1 },
  // The tray's own outer box on the design canvas; `trayTileCenter` turns
  // it into the exact tile the arrow should start from.
  tray: {
    left: TRAY_PORTRAIT.left,
    top: 932 - TRAY_PORTRAIT.bottom - TRAY_PORTRAIT.height,
    width: 430 - TRAY_PORTRAIT.left - TRAY_PORTRAIT.right,
    height: TRAY_PORTRAIT.height,
  },
};

/** Projects a raw board-space point (0..292 on each axis) through the
 * isometric perspective, then into screen space via the board's actual
 * on-screen position/scale — the same transform `Board` itself uses to
 * place pieces, so the arrow always lands exactly where the piece will. */
function projectToScreen(point: { x: number; y: number }, board: CoachmarkLayout['board']) {
  const projected = BoardPerspective.project(point);
  return { x: board.left + projected.x * board.scaleX, y: board.top + projected.y * board.scaleY };
}

function boardPoint(cell: Cell, board: CoachmarkLayout['board']) {
  const cellPx = BoardPerspective.sourceSize / 6;
  return projectToScreen({ x: (cell.c + 0.5) * cellPx, y: (cell.r + 0.5) * cellPx }, board);
}

/** A light-touch, non-interactive coach mark used only during the first five levels. */
export function TutorialCoachmark({
  snapshot,
  layout = DEFAULT_LAYOUT,
}: {
  snapshot: DozorSnapshot;
  layout?: CoachmarkLayout;
}) {
  const levelFivePhase = snapshot.lessonPhase;

  const computeFocus = (): Focus => {
    const level = snapshot.levelNumber;
    if (level === FIRST_SCORED_LEVEL_INDEX) {
      if (levelFivePhase === 'trial') {
        return snapshot.tray.length > 0 ? 'trial' : 'ray';
      }
      if (levelFivePhase === 'overflow') return 'overflow';
      return snapshot.tray.length > 0 ? 'place' : 'ray';
    }
    if (level === 4 && snapshot.pieces.length === 0 && snapshot.solutionCell == null) return 'hint';
    if (snapshot.pieces.length === 0) return 'place';
    if (snapshot.tray.length > 0) return 'place';
    return 'ray';
  };
  const focus = computeFocus();

  const item = snapshot.nextSolutionItem;
  const level = snapshot.levelNumber;
  const firstPlacement = snapshot.pieces.length === 0;

  /** Which line of `tutorialScript` this moment calls for — the wording
   * lives in one shared, testable place, see docs/TUTORIAL_SCRIPT.md. */
  const lineId = (): string => {
    switch (focus) {
      case 'place':
        switch (level) {
          case 1:
            return 'l1.place';
          case 2:
            return firstPlacement ? 'l2.place.first' : 'l2.place.second';
          case 3:
            return firstPlacement ? 'l3.place.first' : 'l3.place.second';
          case 4:
            return item?.type === 'king'
              ? 'l4.place.king'
              : firstPlacement
                ? 'l4.place.first'
                : 'l4.place.next';
          default:
            return firstPlacement ? 'l5.place.first' : 'l5.place.second';
        }
      case 'ray':
        return level <= 4 ? `l${level}.ray` : 'l5.ray';
      case 'hint':
        return 'l4.hint';
      case 'trial':
        return firstPlacement ? 'l5.trial.first' : 'l5.trial.second';
      case 'overflow':
        return 'l5.overflow';
    }
  };

  const text = tutorialLine(lineId(), item?.type);

  const accent = '#70e9f3';
  const { canvasWidth, board, tray } = layout;

  // The card's own on-screen rect — computed once so the arrows that point
  // at interface buttons (hint, ready) can visibly start from its edge
  // instead of an unrelated fixed point floating in empty space.
  const cardTop = layout.isLandscape ? Math.max(12, Math.min(82, board.top - 66)) : 140;
  const cardLeftX = layout.isLandscape ? canvasWidth * 0.18 : 24;
  const cardRightX = canvasWidth - (layout.isLandscape ? canvasWidth * 0.18 : 24);

  /** The tray item's approximate screen position, mirroring the tray's own
   * evenly-distributed slots closely enough for the arrow to clearly point
   * at the next figure. */
  /** The centre of the tile the arrow should come from.
   *
   * Asks the tray where its tiles are rather than re-deriving the layout:
   * this used to assume the tiles were spread evenly across the panel, and
   * once they became fixed-size and centred, the arrow started at a point
   * beside the figure instead of on it. */
  function trayPoint(trayItem: { id: string } | null): { x: number; y: number } {
    const index = trayItem == null ? 0 : snapshot.tray.findIndex((t) => t.id === trayItem.id);
    return trayTileCenter({
      index,
      visibleCount: snapshot.tray.length,
      levelTrayCount: snapshot.levelTrayCount,
      panel: tray,
    });
  }

  let arrow: { from: { x: number; y: number }; to: { x: number; y: number } } | null = null;
  if (focus === 'hint') {
    // Points at the hint lightbulb button in the top-right corner, starting
    // from the card's own top-right edge so the arrow visibly leaves the
    // balloon instead of appearing to come from empty space.
    arrow = layout.isLandscape
      ? { from: { x: cardRightX - 24, y: cardTop }, to: { x: canvasWidth - 42, y: 46 } }
      : { from: { x: cardRightX - 20, y: cardTop + 2 }, to: { x: 367, y: 63 } };
  } else if (focus === 'ray' && snapshot.beams.length > 0) {
    const beam = snapshot.beams[0];
    arrow = {
      from: projectToScreen({ x: beam.points[0].dx, y: beam.points[0].dy }, board),
      to: projectToScreen(
        { x: beam.points[beam.points.length - 1].dx, y: beam.points[beam.points.length - 1].dy },
        board,
      ),
    };
  } else if (focus !== 'overflow') {
    const placement =
      focus === 'trial' ? (snapshot.pieces.length === 0 ? { c: 0, r: 1 } : { c: 4, r: 2 }) : snapshot.nextSolutionCell;
    const from = trayPoint(snapshot.nextSolutionItem);
    const to = placement ? boardPoint(placement, board) : { x: 215, y: 405 };
    arrow = { from, to };
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {arrow && <TutorialArrow from={arrow.from} to={arrow.to} color={accent} />}
      <div
        style={{
          position: 'absolute',
          // One steady position prevents the card from jumping as the
          // instruction changes. In landscape it sits in the narrow strip
          // above the board, kept compact (36% of the screen width) instead
          // of stretching edge to edge, leaving the board and tray clear.
          top: cardTop,
          left: cardLeftX,
          right: canvasWidth - cardRightX,
          padding: '9px 14px 10px',
          borderRadius: 13,
          background: 'rgba(11,23,55,0.92)',
          border: `1.5px solid ${accent}`,
          boxShadow: `0 5px 12px rgba(0,0,0,0.6)`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: '50%',
            border: `1px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            // Which lesson this is, and how many there are — the badge used
            // to show the level number alone, which says nothing about how
            // long the tutorial lasts.
            fontSize: 9,
            color: accent,
          }}
        >
          {level}/{FIRST_SCORED_LEVEL_INDEX}
        </div>
        <div style={{ fontSize: 11.4, lineHeight: 1.3, fontWeight: 800, color: '#f1f5ff' }}>{text}</div>
      </div>
    </div>
  );
}

/**
 * The pointing line/arrowhead pair, a port of `TutorialArrowPainter`. The
 * stem starts 26px away from `from` (or 36% of the line's length, whichever
 * is shorter) rather than exactly at it — the source figure or button is
 * marked by a ring instead, so the stem never visibly cuts through its
 * artwork (e.g. a piece sitting in the tray).
 */
function TutorialArrow({
  from,
  to,
  color,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const dirX = dx / length;
  const dirY = dy / length;
  const offset = Math.min(26, length * 0.36);
  const start = { x: from.x + dirX * offset, y: from.y + dirY * offset };

  const angle = Math.atan2(to.y - start.y, to.x - start.x);
  const head = 17;
  const arrowPoints = [
    to,
    { x: to.x - head * Math.cos(angle - 0.52), y: to.y - head * Math.sin(angle - 0.52) },
    { x: to.x - head * Math.cos(angle + 0.52), y: to.y - head * Math.sin(angle + 0.52) },
  ]
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <line
        x1={start.x}
        y1={start.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={12}
        strokeOpacity={0.28}
        strokeLinecap="round"
      />
      <line x1={start.x} y1={start.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={3.6} strokeLinecap="round" opacity={0.96} />
      <polygon points={arrowPoints} fill={color} />
      <circle cx={from.x} cy={from.y} r={14} stroke={color} strokeOpacity={0.2} strokeWidth={2.4} fill="none" />
      <circle cx={to.x} cy={to.y} r={20} stroke={color} strokeOpacity={0.16} strokeWidth={2} fill="none" />
      <circle cx={to.x} cy={to.y} r={4} fill={color} />
    </svg>
  );
}
