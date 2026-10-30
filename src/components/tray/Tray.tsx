import { useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useL10n } from '../../l10n/l10nContext';
import type { DozorEngine, DozorSnapshot } from "../../game/dozorEngine";
import {
  pieceAttackSummary,
  pieceName,
  pieceSkins,
  type PieceType,
} from "../../game/pieceTypes";
import { PieceArt } from "../board/PieceArt";
import type { DragController } from "../board/useDragController";
import {
  SLOT_LABEL_GAP,
  SLOT_LABEL_HEIGHT,
  TILE_GAP,
  TRAY_PORTRAIT,
  TRAY_PORTRAIT_WIDTH,
  trayRowHeight,
  trayTileExtent,
} from "./trayGeometry";
import { cellHeightForTile, pieceDrawBox } from "../../game/pieceMetrics";
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
   * board uses: the tallest type fills the tile and the rest keep their
   * proportions to it. The tray used to stretch every sprite to its own
   * tile instead, which drew a pawn as tall as a king. */
  height: number;
}) {
  const skin = useCosmeticSkin();
  const l10n = useL10n();
  // The tile's border and its bottom padding are not the square.
  const art = pieceDrawBox(type, cellHeightForTile(height - 8));
  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      role="button"
      aria-pressed={selected}
      aria-label={`${pieceName(l10n, type)}, ${pieceAttackSummary(l10n, type).toLowerCase()}`}
      style={{
        flex: "none",
        width: vertical ? "100%" : extent,
        minWidth: 0,
        minHeight: 0,
        margin: 0,
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
        {/* Picked by a tap, the figure lifts in its slot and hovers until it
            is placed — the same "in the hand" a drag shows. */}
        <div
          className={selected ? "rc-hover" : undefined}
          style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: "100%", height: "100%" }}
        >
        <PieceArt
          type={type}
          width={art.width}
          height={art.height}
          // The tile is the ceiling, not a suggestion. The queen is drawn a
          // touch taller than the king — that is her presence on the board —
          // and 8% over a tile that fits the king exactly is a crown poking
          // through the panel's caption. The app clamps her the same way:
          // its `Image` takes the tile's constraints and letterboxes the
          // sprite inside them, so both platforms shrink her rather than
          // letting her out of the frame.
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
        </div>
      </div>
    </div>
  );
}

/** The tile a figure leaves behind on the board: an empty, quieter frame
 * with a tick in it. */
function PlacedSlotTile() {
  return (
    <div
      aria-hidden
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        background: "rgba(16,27,62,0.4)",
        border: "2px solid rgba(122,107,83,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,215,122,0.7)",
        fontSize: 22,
        fontWeight: 900,
      }}
    >
      ✓
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
  showNames = true,
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
  /** The figure's name under each tile. Off only where the panel is too
   * short to give it a line without shrinking the figure (the rules page's
   * small lesson board, which hands out one figure at a time). */
  showNames?: boolean;
}) {
  const l10n = useL10n();
  const [dragging, setDragging] = useState<PieceType | null>(null);

  const panelWidth = panelExtent ?? TRAY_PORTRAIT_WIDTH;

  // What this level opened with, and which figures have come back since.
  // A level's figures rise into their slots once, in turn, when it opens;
  // one that comes back later springs instead. Kept in refs and updated
  // idempotently, so a second render of the same snapshot changes nothing.
  const ids = snapshot.tray.map((t) => t.id);
  const opening = useRef<{ level: number; ids: Set<string>; delays: Map<string, number> } | null>(null);
  const previous = useRef<string[]>([]);
  const returns = useRef(new Map<string, number>());
  if (opening.current?.level !== snapshot.levelNumber) {
    opening.current = {
      level: snapshot.levelNumber,
      ids: new Set(ids),
      delays: new Map(ids.map((id, i) => [id, 140 + 70 * i])),
    };
    returns.current = new Map();
    previous.current = ids;
  } else if (previous.current.join() !== ids.join()) {
    for (const id of ids) {
      if (!previous.current.includes(id)) returns.current.set(id, (returns.current.get(id) ?? 0) + 1);
    }
    previous.current = ids;
  }

  // The row is placed by figure, not by flex order, so a figure leaving
  // lets the others glide together instead of jumping — which needs the
  // row's own width.
  const row = useRef<HTMLDivElement>(null);
  const [rowExtent, setRowExtent] = useState(0);
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    // Falls back to the panel's own extent where nothing is laid out (a test
    // environment), so the tiles are still there to find.
    const fallback = panelWidth - 25;
    const measure = () =>
      setRowExtent((vertical ? el.clientHeight : el.clientWidth) || fallback);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [vertical, panelWidth]);

  // Tiles keep one size for the whole level.
  //
  // They used to be `flex: 1`, splitting the panel between however many
  // figures were left — so a level that hands out one figure drew a single
  // panel-wide tile around a 45px sprite, and every placement made the
  // survivors jump wider under the finger that had just aimed at one. Sizing
  // from the level's *starting* count fixes both: the row simply gets
  // shorter, centred, as figures leave.
  // The portrait panel keeps the width it was drawn at, whatever the
  // canvas's: `430 - left - right` assumed a 430-unit canvas, and on a wider
  // one (a tablet, a desktop window) the insets grew until the "width" went
  // to zero or below — tiles collapsed, and the coach mark's arrow pointed at
  // a slot that was no longer there.
  const names = showNames && !vertical;
  const rowHeight = trayRowHeight(height);
  const tileExtent = trayTileExtent(
    snapshot.levelTrayCount,
    panelWidth,
    vertical ? undefined : rowHeight,
    names,
  );

  // What the figure in hand is and how it strikes: the one line worth
  // reading while a figure is in the air. Deliberately not a long-press
  // tooltip — on touch the long press eats the drag the player wanted.
  const selected = snapshot.tray.find((t) => t.id === snapshot.sel);
  const inHand = dragging ?? selected?.type ?? null;
  const showHint = snapshot.tray.length > 0 && snapshot.pieces.length === 0;
  // Every figure is out and the level is still unsolved: the way on is to
  // bring one back, and nothing else on screen says so.
  const showDragBack = snapshot.tray.length === 0 && !snapshot.solved;

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
          // Was 9.5/10.5 — 8-9px on a phone. The panel is wider now (inset
          // 64), which is the room the figure's longer line needed.
          fontSize: inHand ? 12 : 13,
          fontWeight: 900,
          letterSpacing: inHand ? 0.3 : 1.8,
          color: inHand ? pieceSkins[inHand].color : "var(--gold)",
          fontFamily: "var(--font-body)",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {inHand
          ? `${pieceName(l10n, inHand).toUpperCase()} · ${pieceAttackSummary(l10n, inHand).toUpperCase()}`
          : showHint
            ? l10n.trayDragToBoard.toUpperCase()
            : showDragBack
              ? l10n.trayDragBack.toUpperCase()
              : l10n.trayPieces.toUpperCase()}
      </div>
      <div style={{ height: 7 }} />
      <div
        ref={row}
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Every figure the level hands out keeps its own slot, named, for
            the whole level; a placed one leaves a tick behind instead of the
            row closing up. The row used to shrink as figures left, so the
            tray only ever showed what was still to do — never how far along
            the player was, and never what the remaining figures were called.
            Not before the row is measured: placed at a width of 0 first, the
            tiles would visibly jump on every mount. */}
        {rowExtent > 0 &&
          engine.level.tray.map((levelItem, index) => {
            const count = snapshot.levelTrayCount;
            const start = (rowExtent - (count * tileExtent + TILE_GAP * (count - 1))) / 2;
            const offset = start + index * (tileExtent + TILE_GAP);
            const item = snapshot.tray.find((t) => t.id === levelItem.id);
            const returned = returns.current.get(levelItem.id) ?? 0;
            const landedSeq = drag.landed?.id === levelItem.id ? drag.landed.seq : 0;
            const springs = returned > 0 || landedSeq > 0;
            const rises = !springs && (opening.current?.ids.has(levelItem.id) ?? false);
            const tileHeight = vertical ? tileExtent : names ? tileExtent : rowHeight;
            return (
              <div
                key={levelItem.id}
                data-tray-slot={levelItem.id}
                style={{
                  position: "absolute",
                  ...(vertical
                    ? { top: offset, left: 0, right: 0, height: tileExtent }
                    : { left: offset, top: 0, bottom: 0, width: tileExtent }),
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: tileHeight,
                    flex: "none",
                    // Empty while its figure flies home, so the figure is not
                    // in two places at once.
                    opacity: drag.flyingId === levelItem.id ? 0 : 1,
                  }}
                >
                  {item == null ? (
                    <PlacedSlotTile />
                  ) : (
                    <div
                      className={rises ? "rc-tile-rise" : undefined}
                      style={{
                        width: "100%",
                        height: "100%",
                        animationDelay: rises ? `${opening.current?.delays.get(item.id) ?? 140}ms` : undefined,
                      }}
                    >
                      <div
                        key={`pop-${returned}-${landedSeq}`}
                        className={springs ? "rc-pop" : undefined}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <TrayItemTile
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
                          height={tileHeight}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {names && (
                  <div
                    style={{
                      marginTop: SLOT_LABEL_GAP,
                      height: SLOT_LABEL_HEIGHT,
                      lineHeight: `${SLOT_LABEL_HEIGHT}px`,
                      maxWidth: "100%",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "clip",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 0.2,
                      fontFamily: "var(--font-body)",
                      color: item == null ? "rgba(167,183,209,0.5)" : "#e9eef9",
                    }}
                  >
                    {pieceName(l10n, levelItem.type)}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
