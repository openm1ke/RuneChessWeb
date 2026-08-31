import { useEffect, useRef, useState } from 'react';
import type { DozorSnapshot } from '../../game/dozorEngine';
import { cellKey, type Cell } from '../../game/models';
import type { PieceType } from '../../game/pieceTypes';
import { FIRST_SCORED_LEVEL_INDEX } from '../../data/campaignLevels';
import { BoardPerspective, BOARD_LEFT, BOARD_TOP } from '../board/boardPerspective';

type Focus = 'place' | 'ray' | 'ready' | 'hint' | 'reset' | 'trial' | 'overflow';
type LevelFivePhase = 'trial' | 'overflow' | 'solution';

const PIECE_NAME: Record<PieceType, string> = {
  rook: 'ладью',
  bishop: 'слона',
  knight: 'коня',
  king: 'короля',
  queen: 'ферзя',
  pawn: 'пешку',
};

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
  // Mirrors the tray's own inner content rect (96px outer margin + 10px
  // padding on each side); height 0 collapses to the single fixed row the
  // original portrait design pointed at.
  tray: { left: 106, top: 764, width: 218, height: 0 },
};

function hasOverfilledCoin(snapshot: DozorSnapshot): boolean {
  return snapshot.beacons.some((beacon) => (snapshot.counts[cellKey(beacon.c, beacon.r)] ?? 0) > beacon.target);
}

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
  const [levelFivePhase, setLevelFivePhase] = useState<LevelFivePhase>(() =>
    snapshot.levelNumber === FIRST_SCORED_LEVEL_INDEX && hasOverfilledCoin(snapshot) ? 'overflow' : 'trial',
  );
  const prevLevelRef = useRef(snapshot.levelNumber);

  useEffect(() => {
    if (prevLevelRef.current !== snapshot.levelNumber) {
      prevLevelRef.current = snapshot.levelNumber;
      setLevelFivePhase('trial');
      return;
    }
    if (snapshot.levelNumber !== FIRST_SCORED_LEVEL_INDEX) return;
    setLevelFivePhase((phase) => {
      if (phase === 'trial' && snapshot.tray.length === 0 && hasOverfilledCoin(snapshot)) return 'overflow';
      if (phase === 'overflow' && snapshot.pieces.length === 0) return 'solution';
      return phase;
    });
  }, [snapshot]);

  const computeFocus = (): Focus => {
    const level = snapshot.levelNumber;
    if (level === FIRST_SCORED_LEVEL_INDEX) {
      if (levelFivePhase === 'trial') {
        return snapshot.tray.length > 0 ? 'trial' : hasOverfilledCoin(snapshot) ? 'overflow' : 'ray';
      }
      if (levelFivePhase === 'overflow') return 'overflow';
      return snapshot.tray.length > 0 ? 'place' : 'ray';
    }
    if (level === 4 && snapshot.pieces.length === 0 && snapshot.solutionCell == null) return 'hint';
    if (snapshot.pieces.length === 0) return 'place';
    if (snapshot.tray.length > 0) return 'place';
    if (snapshot.beams.length > 0) return 'ray';
    if (snapshot.solved) return 'ready';
    return 'ray';
  };
  const focus = computeFocus();

  const item = snapshot.nextSolutionItem;
  const name = item ? PIECE_NAME[item.type] : 'фигуру';
  const level = snapshot.levelNumber;

  const text = (() => {
    if (focus === 'ray' && snapshot.solved) {
      return 'Пунктирная линия показывает, как фигура доходит до монеты. Монеты засияли — можно нажать «ГОТОВО».';
    }
    switch (focus) {
      case 'place':
        switch (level) {
          case 1:
            return 'Пешка бьёт по диагонали вперёд. Перетащите её на подсвеченную клетку.';
          case 2:
            return snapshot.pieces.length === 0
              ? `Здесь две фигуры: ладья и слон. Начните с ${name} и подсвеченной клетки.`
              : `Теперь поставьте вторую фигуру: ${name} уже ждёт вас в панели.`;
          case 3:
            return snapshot.pieces.length === 0
              ? `Три монеты с разными номиналами ждут коня и ладью. Начните с ${name}.`
              : `Отлично! Теперь поставьте вторую фигуру: ${name} уже ждёт вас в панели.`;
          case 4:
            return item?.type === 'king'
              ? 'Король бьёт только на одну клетку вокруг себя. Поставьте его на подсвеченную клетку.'
              : snapshot.pieces.length === 0
              ? `Здесь четыре монеты и три фигуры. Начните с ${name}.`
              : `Продолжайте: поставьте ${name} на подсвеченную клетку.`;
          default:
            return snapshot.pieces.length === 0
              ? 'После сброса поставьте ладью на подсвеченную клетку.'
              : 'Теперь поставьте ферзя на вторую подсвеченную клетку. Ферзь ходит и по прямым, и по диагоналям.';
        }
      case 'ray':
        switch (level) {
          case 1:
            return 'Пунктирная линия показывает, как фигура доходит до монеты.';
          case 2:
            return 'Ладья ходит по прямым, а слон — по диагоналям. Каждая монета здесь ждёт один удар.';
          case 3:
            return 'Цифра на монете — нужное число ударов: «1» — один, «2» — два. Проверьте все три монеты.';
          case 4:
            return 'Чтобы пройти уровень, все четыре монеты должны получить ровно нужное количество ударов.';
          default:
            return 'Проверьте линии: две фигуры должны вместе зажечь все три монеты.';
        }
      case 'ready':
        return 'Все монеты поднялись и светятся. Уровень пройден — нажмите «ГОТОВО».';
      case 'hint':
        return 'Если не знаете, куда поставить фигуру, нажмите лампочку. На поле появится прозрачный силуэт.';
      case 'reset':
        return 'Хотите начать заново? Нажмите круглую стрелку слева внизу — все фигуры вернутся в панель.';
      case 'trial':
        return snapshot.pieces.length === 0
          ? 'Давайте попробуем вариант: поставьте ладью на подсвеченную клетку.'
          : 'Теперь поставьте ферзя на подсвеченную клетку. Он ходит и по прямым, и по диагоналям.';
      case 'overflow':
        return 'Эта монета получила больше ударов, чем написано на ней. Условие не выполнится — нажмите сброс и попробуйте ещё раз.';
    }
  })();

  const accent = focus === 'ready' ? '#ffd56a' : '#70e9f3';
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
  function trayPoint(trayItem: { id: string } | null): { x: number; y: number } {
    const index = trayItem == null ? 0 : snapshot.tray.findIndex((t) => t.id === trayItem.id);
    const count = Math.max(1, snapshot.tray.length);
    return {
      x: tray.left + tray.width * ((Math.max(0, index) + 0.5) / count),
      y: tray.top + tray.height / 2,
    };
  }

  let arrow: { from: { x: number; y: number }; to: { x: number; y: number } } | null = null;
  if (focus === 'hint') {
    // Points at the hint lightbulb button in the top-right corner, starting
    // from the card's own top-right edge so the arrow visibly leaves the
    // balloon instead of appearing to come from empty space.
    arrow = layout.isLandscape
      ? { from: { x: cardRightX - 24, y: cardTop }, to: { x: canvasWidth - 42, y: 46 } }
      : { from: { x: cardRightX - 20, y: cardTop + 2 }, to: { x: 367, y: 63 } };
  } else if (focus === 'ready') {
    // Points straight up at the "УРОВЕНЬ / N of M" status pill, starting
    // from the card's own top-centre edge.
    arrow = layout.isLandscape
      ? { from: { x: (cardLeftX + cardRightX) / 2, y: cardTop }, to: { x: canvasWidth / 2, y: 52 } }
      : { from: { x: (cardLeftX + cardRightX) / 2, y: cardTop + 2 }, to: { x: 215, y: 98 } };
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
            fontSize: 11,
            color: accent,
          }}
        >
          {level}
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
