import { useRef, useState, createElement, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { DozorEngine } from '../../game/dozorEngine';
import type { Cell, Piece, TrayItem } from '../../game/models';
import { useCosmeticSkin } from '../../game/cosmeticSkinContext';
import { uprightRotationOf } from '../../game/cosmeticSkins';
import { BoardPerspective } from './boardPerspective';
import { playPieceLift, playPieceSet } from '../../services/musicService';

interface DragState {
  kind: 'board' | 'tray';
  piece?: Piece;
  item?: TrayItem;
  x: number;
  y: number;
}

export interface DragController {
  startFromBoard: (piece: Piece, event: ReactPointerEvent) => void;
  startFromTray: (item: TrayItem, event: ReactPointerEvent) => void;
  feedback: ReactNode;
}

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
      if (!cell) return;
      if (current.kind === 'tray' && current.item) {
        if (engine.dropTrayItem(current.item.id, cell.c, cell.r)) playPieceSet();
      } else if (current.kind === 'board' && current.piece) {
        if (engine.movePiece(current.piece.id, cell.c, cell.r)) playPieceSet();
      }
      return;
    }

    if (current.kind === 'board' && current.piece && pointInRect(clientX, clientY, trayRect)) {
      engine.returnPieceToTray(current.piece.id);
    }
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
    updateDrag({ kind: 'board', piece, x: event.clientX, y: event.clientY });
    attachWindowListeners();
  };

  const startFromTray = (item: TrayItem, event: ReactPointerEvent) => {
    event.stopPropagation();
    playPieceLift();
    updateDrag({ kind: 'tray', item, x: event.clientX, y: event.clientY });
    attachWindowListeners();
  };

  const type = drag?.piece?.type ?? drag?.item?.type;
  const sprite = drag && type
    ? createElement('img', {
        src: skin.pieceAssets[type],
        alt: '',
        style: {
          position: 'fixed',
          left: drag.x - 29,
          top: drag.y - 60,
          width: 58,
          height: 70,
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 1000,
          transform: `rotate(${uprightRotationOf(skin, type)}deg)`,
          filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.5))',
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
  const feedback = sprite ? createPortal(sprite, document.body) : null;

  return { startFromBoard, startFromTray, feedback };
}
