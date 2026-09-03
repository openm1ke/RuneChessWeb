import { useRef, useState, createElement, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import type { DozorEngine } from '../../game/dozorEngine';
import type { Piece, TrayItem } from '../../game/models';
import { pieceAsset, pieceUprightRotationDeg } from '../../game/pieceTypes';
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
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const pointInRect = (x: number, y: number, rect: DOMRect | undefined): boolean =>
    !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  const finishDrag = (clientX: number, clientY: number) => {
    const current = dragRef.current;
    updateDrag(null);
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
  const feedback = drag && type
    ? createElement('img', {
        src: pieceAsset[type],
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
          transform: `rotate(${pieceUprightRotationDeg[type] ?? 0}deg)`,
          filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.5))',
        },
      })
    : null;

  return { startFromBoard, startFromTray, feedback };
}
