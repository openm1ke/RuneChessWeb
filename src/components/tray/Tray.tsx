import { useState, type PointerEvent, type RefObject } from "react";
import type { DozorEngine, DozorSnapshot } from "../../game/dozorEngine";
import {
  pieceAttackSummary,
  pieceNames,
  pieceSkins,
  type PieceType,
} from "../../game/pieceTypes";
import { PieceArt } from "../board/PieceArt";
import type { DragController } from "../board/useDragController";
import { TILE_GAP, TRAY_PORTRAIT, trayRowHeight, trayTileExtent } from "./trayGeometry";
import { pieceDrawBox, trayCellHeight } from "../../game/pieceMetrics";
import { BoardPerspective } from "../board/boardPerspective";
import { useCosmeticSkin } from "../../game/cosmeticSkinContext";
import { uprightRotationOf } from "../../game/cosmeticSkins";

function TrayItemTile({
  type,
  selected,
  onClick,
  onPointerDown,
  vertical,
  extent,
  height,
  boardCellHeight,
}: {
  type: PieceType;
  selected: boolean;
  onClick: () => void;
  onPointerDown: (event: PointerEvent) => void;
  vertical: boolean;
  /** Width (or height, in the vertical tray) this tile keeps for the whole
   * level — see `Tray`'s `tileExtent`. */
  extent: number;
  /** How tall the tile is. The figure inside is drawn to the same rules the
   * board uses, so a piece is the same size and the same shape in both
   * places — the tray used to stretch every sprite to its tile, which drew a
   * pawn as tall as a king and none of them the size they would land at. */
  height: number;
  /** The board's own square, which the figure is sized against whenever the
   * tile has room for it. */
  boardCellHeight: number;
}) {
  const skin = useCosmeticSkin();
  // The tile's border and its bottom padding are not the square.
  const art = pieceDrawBox(type, trayCellHeight(height - 8, boardCellHeight));
  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      role="button"
      aria-pressed={selected}
      aria-label={`${pieceNames[type]}, бьёт ${pieceAttackSummary[type].toLowerCase()}`}
      style={{
        flex: "none",
        width: vertical ? "100%" : extent,
        minWidth: 0,
        minHeight: 0,
        margin: vertical ? `${TILE_GAP / 2}px 0` : `0 ${TILE_GAP / 2}px`,
        height: vertical ? extent : "100%",
        borderRadius: 12,
        background: selected ? "#263f82" : "#172551",
        border: `2px solid ${selected ? "var(--gold)" : "rgba(122,107,83,0.6)"}`,
        boxShadow: selected ? `0 0 12px ${pieceSkins[type].glow}` : "none",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 4,
        cursor: "pointer",
        transition: "background 160ms, border-color 160ms",
      }}
    >
      <div
        style={{
          transform: `rotate(${uprightRotationOf(skin, type)}deg)`,
          transformOrigin: "bottom center",
          // The sprite keeps its aspect but is bounded by the tile rather
          // than by a fixed 44×70, so a crowded tray narrows its pieces the
          // way the mobile app's Expanded tiles already do.
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          minWidth: 0,
          width: "100%",
          // An explicit height: the sprite below sizes itself as a
          // percentage, and a percentage of an auto height falls back to the
          // image's natural 70px — which is how the figure ended up sticking
          // out of the tile's outline.
          height: "100%",
          maxWidth: "100%",
        }}
      >
        <PieceArt
          type={type}
          width={art.width}
          height={art.height}
          style={{ maxWidth: "100%" }}
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
  left = TRAY_PORTRAIT.left,
  right = TRAY_PORTRAIT.right,
  bottom = TRAY_PORTRAIT.bottom,
  height = TRAY_PORTRAIT.height,
  vertical = false,
  panelExtent,
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
  /** How wide (or tall) the tile row may be. Defaults to the portrait
   * panel's own width. */
  panelExtent?: number;
}) {
  const [dragging, setDragging] = useState<PieceType | null>(null);

  // Tiles keep one size for the whole level.
  //
  // They used to be `flex: 1`, splitting the panel between however many
  // figures were left — so a level that hands out one figure drew a single
  // panel-wide tile around a 45px sprite, and every placement made the
  // survivors jump wider under the finger that had just aimed at one. Sizing
  // from the level's *starting* count fixes both: the row simply gets
  // shorter, centred, as figures leave.
  const tileExtent = trayTileExtent(
    snapshot.levelTrayCount,
    panelExtent ?? 430 - left - right,
  );

  // What the figure in hand is and how it strikes: the one line worth
  // reading while a figure is in the air. Deliberately not a long-press
  // tooltip — on touch the long press eats the drag the player wanted.
  const selected = snapshot.tray.find((t) => t.id === snapshot.sel);
  const inHand = dragging ?? selected?.type ?? null;
  const showHint = snapshot.tray.length > 0 && snapshot.pieces.length === 0;

  return (
    <div
      ref={trayRef}
      style={{
        position: "absolute",
        left,
        right,
        bottom,
        height,
        padding: "8px 10px 10px",
        borderRadius: 16,
        background:
          "linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))",
        border: "2.5px solid var(--gold-border)",
        boxShadow: "0 -8px 26px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* One line at a time, in the order of what the player needs: the
          figure in hand, then what to do with it, then the panel's own
          label. Two of them side by side collided at the portrait panel's
          218px. */}
      <div
        style={{
          // The figure's line is the longest thing this row ever shows;
          // it gets its own size so it fits the 218px portrait panel whole
          // instead of ellipsising ("…ПО ДИАГОНАЛИ…" helps nobody).
          fontSize: inHand ? 9.5 : 10.5,
          fontWeight: 900,
          letterSpacing: inHand ? 0.4 : 2.4,
          color: inHand ? pieceSkins[inHand].color : "var(--gold)",
          fontFamily: "var(--font-body)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {inHand
          ? `${pieceNames[inHand].toUpperCase()} · ${pieceAttackSummary[inHand].toUpperCase()}`
          : showHint
            ? "ПЕРЕТАЩИТЕ НА ДОСКУ"
            : "ФИГУРЫ"}
      </div>
      <div style={{ height: 7 }} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {snapshot.tray.length === 0 ? (
          snapshot.solved ? null : (
            // The panel used to go blank with "0 ОСТАЛОСЬ" at exactly the
            // moment a player who has run out of figures without solving the
            // level needs to know what to do. Dragging one back is the answer,
            // and nothing had ever mentioned it existed.
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.35,
                textAlign: "center",
                color: "rgba(255,231,178,0.62)",
                fontFamily: "var(--font-body)",
              }}
            >
              Все фигуры на доске.
              <br />
              Перетащите фигуру сюда, чтобы переставить.
            </div>
          )
        ) : (
          snapshot.tray.map((item) => (
            <TrayItemTile
              key={item.id}
              type={item.type}
              selected={item.id === snapshot.sel}
              onClick={() => engine.tapTray(item.id)}
              onPointerDown={(e) => {
                setDragging(item.type);
                const clear = () => {
                  setDragging(null);
                  window.removeEventListener("pointerup", clear);
                };
                window.addEventListener("pointerup", clear);
                drag.startFromTray(item, e);
              }}
              vertical={vertical}
              extent={tileExtent}
              height={vertical ? tileExtent : trayRowHeight(height)}
              boardCellHeight={
                (BoardPerspective.height * snapshot.cellPx) / BoardPerspective.sourceSize
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
