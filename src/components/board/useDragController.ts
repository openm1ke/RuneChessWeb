import { Fragment, useRef, useState, createElement, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { DozorEngine } from '../../game/dozorEngine';
import type { Cell, Piece, TrayItem } from '../../game/models';
import type { PieceType } from '../../game/pieceTypes';
import { useCosmeticSkin } from '../../game/cosmeticSkinContext';
import { uprightRotationOf } from '../../game/cosmeticSkins';
import { BoardPerspective } from './boardPerspective';
import { pieceDrawBox } from '../../game/pieceMetrics';
import { playPieceLift, playPieceSet } from '../../services/musicService';

/** The square a figure in the air is drawn against: the 6x6 board's own,
 * a touch larger, so a lifted piece reads as lifted. */
const DRAG_CELL_HEIGHT = (BoardPerspective.height / 6) * 1.15;
/** How far below the cursor the figure's feet hang. */
const DRAG_FOOT_DROP = 10;

interface DragState {
  kind: 'board' | 'tray';
  piece?: Piece;
  item?: TrayItem;
  x: number;
  y: number;
  /** Where the figure was picked up from, in viewport px — where it flies
   * back to if it is let go anywhere that does not take it. */
  origin: DOMRect;
  /** Where the pointer went down. A press that never travelled is a tap,
   * not a throw, and must not fly anywhere. */
  startX: number;
  startY: number;
}

/** A figure on its way home after a drag nothing accepted. */
interface Flight {
  id: string;
  type: PieceType;
  /** The sprite's top-left at release, and its size. */
  left: number;
  top: number;
  width: number;
  height: number;
  footInset: number;
  to: DOMRect;
}

export interface DragController {
  startFromBoard: (piece: Piece, event: ReactPointerEvent) => void;
  startFromTray: (item: TrayItem, event: ReactPointerEvent) => void;
  feedback: ReactNode;
  /** The figure currently in the hand, so its square or slot can show it
   * has been lifted. */
  draggingId: string | null;
  /** A figure flying home: its slot stays empty until it lands. */
  flyingId: string | null;
  /** Bumped each time a figure lands back in its slot, so the slot can
   * spring once. */
  landed: { id: string; seq: number } | null;
}

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Pointer-based drag-and-drop shared between the board and the tray: a
 * piece picked up from the board can be dropped back on the board (move) or
 * on the tray (return); a tray item can be dropped on the board (place).
 * Tap-to-select/tap-to-place (`DozorEngine.tapPiece`/`tapTray`/`tapCell`)
 * keeps working independently — this only adds the drag affordance on top,
 * same as the original Flutter `Draggable`/`DragTarget` pair.
 */
export function useDragController(
  engine: DozorEngine,
  boardRef: RefObject<HTMLDivElement>,
  trayRef: RefObject<HTMLDivElement>,
): DragController {
  const skin = useCosmeticSkin();
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState<{ id: string; seq: number } | null>(null);
  const landedSeq = useRef(0);

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const pointInRect = (x: number, y: number, rect: DOMRect | undefined): boolean =>
    !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  /** The board cell under the pointer, or null when it is off the board. */
  const cellUnder = (clientX: number, clientY: number): Cell | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!pointInRect(clientX, clientY, rect) || !rect) return null;
    return BoardPerspective.unprojectCell(
      {
        x: (clientX - rect.left) * (BoardPerspective.width / rect.width),
        y: (clientY - rect.top) * (BoardPerspective.height / rect.height),
      },
      engine.snapshot().boardSize,
    );
  };

  /** Keeps the board's "what would this strike" preview in step with the
   * pointer — the whole point of dragging slowly over the board. */
  const updatePreview = (state: DragState, clientX: number, clientY: number) => {
    const cell = cellUnder(clientX, clientY);
    const id = state.item?.id ?? state.piece?.id ?? null;
    const allowed =
      cell != null &&
      id != null &&
      (state.kind === 'tray'
        ? engine.canDropTrayItem(cell.c, cell.r)
        : engine.canMovePiece(id, cell.c, cell.r));
    engine.setDragPreview(allowed ? id : null, allowed ? cell : null);
  };

  const finishDrag = (clientX: number, clientY: number) => {
    const current = dragRef.current;
    updateDrag(null);
    engine.clearDragPreview();
    if (!current) return;
    if (!settleDrag(current, clientX, clientY)) flyHome(current, clientX, clientY);
  };

  /** Let go anywhere that does not take the figure — off the board, or on
   * a square it may not stand on — and it goes back to where it came from,
   * visibly, instead of vanishing from under the finger. */
  const flyHome = (current: DragState, clientX: number, clientY: number) => {
    const type = current.piece?.type ?? current.item?.type;
    const id = current.piece?.id ?? current.item?.id;
    if (!type || !id || reduceMotion()) return;
    if (Math.hypot(clientX - current.startX, clientY - current.startY) < 10) return;
    const box = pieceDrawBox(type, DRAG_CELL_HEIGHT);
    setFlight({
      id,
      type,
      left: clientX - box.width / 2,
      top: clientY + box.footInset - box.height + DRAG_FOOT_DROP,
      width: box.width,
      height: box.height,
      footInset: box.footInset,
      to: current.origin,
    });
  };

  const landHome = (id: string) => {
    setFlight(null);
    landedSeq.current += 1;
    setLanded({ id, seq: landedSeq.current });
  };

  /** Applies the drop; true when something took the figure. */
  const settleDrag = (current: DragState, clientX: number, clientY: number): boolean => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    const trayRect = trayRef.current?.getBoundingClientRect();

    if (pointInRect(clientX, clientY, boardRect) && boardRect) {
      const scaleX = BoardPerspective.width / boardRect.width;
      const scaleY = BoardPerspective.height / boardRect.height;
      const cell = BoardPerspective.unprojectCell(
        {
          x: (clientX - boardRect.left) * scaleX,
          y: (clientY - boardRect.top) * scaleY,
        },
        engine.snapshot().boardSize,
      );
      if (!cell) return false;
      if (current.kind === 'tray' && current.item) {
        if (engine.dropTrayItem(current.item.id, cell.c, cell.r)) {
          playPieceSet();
          return true;
        }
      } else if (current.kind === 'board' && current.piece) {
        // Dropped back on its own square counts as taken: nothing to fly.
        if (current.piece.c === cell.c && current.piece.r === cell.r) return true;
        if (engine.movePiece(current.piece.id, cell.c, cell.r)) {
          playPieceSet();
          return true;
        }
      }
      return false;
    }

    if (current.kind === 'board' && current.piece && pointInRect(clientX, clientY, trayRect)) {
      return engine.returnPieceToTray(current.piece.id);
    }
    // A tray figure let go over its own tray is simply put back.
    if (current.kind === 'tray' && pointInRect(clientX, clientY, trayRect)) return false;
    return false;
  };

  const attachWindowListeners = () => {
    const handleMove = (event: PointerEvent) => {
      const prev = dragRef.current;
      if (!prev) return;
      updateDrag({ ...prev, x: event.clientX, y: event.clientY });
      updatePreview(prev, event.clientX, event.clientY);
    };
    const handleUp = (event: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      finishDrag(event.clientX, event.clientY);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const startFromBoard = (piece: Piece, event: ReactPointerEvent) => {
    event.stopPropagation();
    playPieceLift();
    const origin = (event.currentTarget as HTMLElement).getBoundingClientRect();
    updateDrag({ kind: 'board', piece, x: event.clientX, y: event.clientY, origin, startX: event.clientX, startY: event.clientY });
    attachWindowListeners();
  };

  const startFromTray = (item: TrayItem, event: ReactPointerEvent) => {
    event.stopPropagation();
    playPieceLift();
    const origin = (event.currentTarget as HTMLElement).getBoundingClientRect();
    updateDrag({ kind: 'tray', item, x: event.clientX, y: event.clientY, origin, startX: event.clientX, startY: event.clientY });
    attachWindowListeners();
  };

  // Nothing lifts until the pointer has actually travelled: a tap selects
  // a figure, it does not pick one up, and drawing a figure in the air for
  // the length of a tap was a flicker under the finger.
  const lifted = drag != null && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 6;
  const type = lifted ? (drag?.piece?.type ?? drag?.item?.type) : undefined;
  // The figure in the air is the same figure, a touch larger than it will
  // be once it lands — sized by the same rules as the board and the tray so
  // it does not change shape between the three.
  const held = type ? pieceDrawBox(type, DRAG_CELL_HEIGHT) : null;
  // In the hand the figure hovers — it comes up a touch large, then bobs
  // and leans on its foot — the same as the app's dragged figure.
  const sprite = drag && type && held
    ? createElement(
        'div',
        {
          style: {
            position: 'fixed',
            left: drag.x - held.width / 2,
            top: drag.y + held.footInset - held.height + DRAG_FOOT_DROP,
            width: held.width,
            height: held.height,
            pointerEvents: 'none',
            zIndex: 1000,
          },
        },
        createElement(
          'div',
          { className: 'rc-pickup', style: { width: '100%', height: '100%' } },
          createElement(
            'div',
            { className: 'rc-hover', style: { width: '100%', height: '100%' } },
            createElement('img', {
              src: skin.pieceAssets[type],
              alt: '',
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `rotate(${uprightRotationOf(skin, type)}deg)`,
                transformOrigin: 'bottom center',
                filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.5))',
              },
            }),
          ),
        ),
      )
    : null;

  // The figure flying home: the same sprite, moved in viewport px on a
  // shallow arc and shrinking into its slot over the last third.
  const flyer = flight
    ? createElement('img', {
        key: `flight-${flight.id}-${flight.left}-${flight.top}`,
        src: skin.pieceAssets[flight.type],
        alt: '',
        ref: (el: HTMLImageElement | null) => {
          if (!el || el.dataset.flying) return;
          el.dataset.flying = '1';
          const to = flight.to;
          const scaleTo = 0.78;
          const dx = to.left + to.width / 2 - (flight.left + flight.width / 2);
          const dy = to.bottom - flight.height * scaleTo - flight.top;
          const animation = el.animate(
            [
              { transform: 'translate(0px, 0px) scale(1)' },
              { transform: `translate(${dx / 2}px, ${dy / 2 - 28}px) scale(1)`, offset: 0.5 },
              { transform: `translate(${dx * 0.85}px, ${dy * 0.85}px) scale(1)`, offset: 0.66 },
              { transform: `translate(${dx}px, ${dy}px) scale(${scaleTo})` },
            ],
            { duration: 300, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
          );
          animation.onfinish = () => landHome(flight.id);
        },
        style: {
          position: 'fixed',
          left: flight.left,
          top: flight.top,
          width: flight.width,
          height: flight.height,
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 1000,
          transformOrigin: 'bottom center',
          filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.45))',
        },
      })
    : null;

  // Rendered into `document.body`, not where the board sits.
  //
  // `position: fixed` is only viewport-relative while no ancestor has a
  // transform — and every scene lives inside `DesignCanvas`, which scales
  // and centres itself with one. Inside that, the sprite was being placed
  // at the pointer's *viewport* coordinates interpreted in the canvas's own
  // space: measured at 128px to the right of the cursor on a desktop-width
  // window, and off by however much the canvas is offset elsewhere. Mobile
  // never had this because Flutter draws drag feedback in a screen-level
  // overlay.
  const feedback =
    sprite || flyer ? createPortal(createElement(Fragment, null, sprite, flyer), document.body) : null;

  return {
    startFromBoard,
    startFromTray,
    feedback,
    draggingId: lifted ? (drag?.piece?.id ?? drag?.item?.id ?? null) : null,
    flyingId: flight?.id ?? null,
    landed,
  };
}
