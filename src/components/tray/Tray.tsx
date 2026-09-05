import type { PointerEvent, RefObject } from 'react';
import type { DozorEngine, DozorSnapshot } from '../../game/dozorEngine';
import { pieceSkins, pieceUprightRotationDeg, type PieceType } from '../../game/pieceTypes';
import { PieceArt } from '../board/PieceArt';
import type { DragController } from '../board/useDragController';

function TrayItemTile({
  type,
  selected,
  onClick,
  onPointerDown,
  vertical,
}: {
  type: PieceType;
  selected: boolean;
  onClick: () => void;
  onPointerDown: (event: PointerEvent) => void;
  vertical: boolean;
}) {
  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{
        flex: 1,
        // Without this a flex item refuses to shrink below its content's
        // width, and the fixed-size sprite inside made that 44px: six tray
        // pieces then needed more room than the panel has and simply spilled
        // out of it. Campaign levels hand out at most four, so nothing showed
        // this until a daily challenge dealt six.
        minWidth: 0,
        minHeight: 0,
        margin: vertical ? '3.5px 0' : '0 3.5px',
        height: '100%',
        borderRadius: 12,
        background: selected ? '#263f82' : '#172551',
        border: `2px solid ${selected ? 'var(--gold)' : 'rgba(122,107,83,0.6)'}`,
        boxShadow: selected ? `0 0 12px ${pieceSkins[type].glow}` : 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 4,
        cursor: 'pointer',
        transition: 'background 160ms, border-color 160ms',
      }}
    >
      <div
        style={{
          transform: `rotate(${pieceUprightRotationDeg[type] ?? 0}deg)`,
          transformOrigin: 'bottom center',
          // The sprite keeps its aspect but is bounded by the tile rather
          // than by a fixed 44×70, so a crowded tray narrows its pieces the
          // way the mobile app's Expanded tiles already do.
          display: 'flex',
          justifyContent: 'center',
          minWidth: 0,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <PieceArt
          type={type}
          style={{ width: 'auto', height: '100%', maxWidth: '100%', maxHeight: 70 }}
        />
      </div>
    </div>
  );
}

export function Tray({
  engine,
  snapshot,
  drag,
  trayRef,
  left = 96,
  right = 96,
  bottom = 120,
  height = 104,
  vertical = false,
}: {
  engine: DozorEngine;
  snapshot: DozorSnapshot;
  drag: DragController;
  trayRef: RefObject<HTMLDivElement>;
  /** Landscape mode places the tray in a vertical lane on the right edge. */
  left?: number;
  right?: number;
  bottom?: number;
  height?: number;
  vertical?: boolean;
}) {
  return (
    <div
      ref={trayRef}
      style={{
        position: 'absolute',
        left,
        right,
        bottom,
        height,
        padding: '8px 10px 10px',
        borderRadius: 16,
        background: 'linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))',
        border: '2.5px solid var(--gold-border)',
        boxShadow: '0 -8px 26px rgba(0,0,0,0.55)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 900,
            letterSpacing: 2.4,
            color: 'var(--gold)',
            fontFamily: 'var(--font-body)',
          }}
        >
          ФИГУРЫ
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 900,
            letterSpacing: 1.3,
            color: 'rgba(255,231,178,0.62)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {snapshot.tray.length} ОСТАЛОСЬ
        </span>
      </div>
      <div style={{ height: 7 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: vertical ? 'column' : 'row' }}>
        {snapshot.tray.map((item) => (
          <TrayItemTile
            key={item.id}
            type={item.type}
            selected={item.id === snapshot.sel}
            onClick={() => engine.tapTray(item.id)}
            onPointerDown={(e) => drag.startFromTray(item, e)}
            vertical={vertical}
          />
        ))}
      </div>
    </div>
  );
}
