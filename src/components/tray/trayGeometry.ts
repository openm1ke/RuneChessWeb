/**
 * Where the tray draws its tiles, so that anything pointing at one asks
 * rather than guesses — the coach mark's arrow used to re-derive this layout
 * by hand, and landed beside the figure once the tiles stopped stretching.
 *
 * Mirrors `TrayGeometry` in the mobile app's `lib/widgets/game/tray.dart`.
 */

/** Gap between tiles, and the extent a tile never exceeds — past this a
 * figure is just a small sprite in a large empty box. */
export const TILE_GAP = 7;
// Raised from 64 with the panel: the canvas reaches a phone at x0.75-0.91,
// and a five-figure level divided the old panel into ~29px tiles.
const MAX_TILE_EXTENT = 78;
/** Shared with the rendered panel: the border, caption and gap all take
 * space away from the row, not just its padding. */
export const TRAY_METRICS = {
  border: 2.5,
  paddingInline: 10,
  paddingTop: 8,
  paddingBottom: 10,
  headerHeight: 18,
  headerGap: 7,
} as const;
const TRAY_INLINE_INSET = TRAY_METRICS.border + TRAY_METRICS.paddingInline;

/** The portrait tray's box on the 430x932 design canvas. Taller than the
 * 116 it was drawn at by the name line under each figure, so the tiles keep
 * their size. */
export const TRAY_PORTRAIT = { left: 64, right: 64, bottom: 120, height: 140 };

/** The figure's name under its tile, and the gap above it. */
export const SLOT_LABEL_HEIGHT = 18;
export const SLOT_LABEL_GAP = 3;

/** The panel's own width, and where it sits on a canvas this wide: it keeps
 * the width it was drawn at and is centred, so a broad screen gets a panel
 * rather than a strip. One source for it, because two things need the same
 * answer — the tray draws itself here, and the coach mark points at a tile
 * in it. Mirrors the app's `trayPortraitInset`. */
export const TRAY_PORTRAIT_WIDTH = 430 - TRAY_PORTRAIT.left - TRAY_PORTRAIT.right;

export function trayPortraitInset(canvasWidth: number): number {
  return (canvasWidth - TRAY_PORTRAIT_WIDTH) / 2;
}

/** How tall the row of tiles is inside a panel `height` tall. */
export function trayRowHeight(height: number): number {
  return Math.max(0, height - TRAY_METRICS.border * 2 - TRAY_METRICS.paddingTop
    - TRAY_METRICS.headerHeight - TRAY_METRICS.headerGap - TRAY_METRICS.paddingBottom);
}

/** The extent one tile takes. Every figure the level hands out keeps its
 * own slot for the whole level, so this depends on that count only — and,
 * when the row's height is given, on leaving room for the name under it. */
export function trayTileExtent(
  levelTrayCount: number,
  panelExtent: number,
  rowHeight?: number,
  withName = true,
): number {
  const total = Math.max(1, levelTrayCount);
  const along = (panelExtent - TRAY_INLINE_INSET * 2 - TILE_GAP * (total - 1)) / total;
  const across =
    rowHeight == null ? Infinity : rowHeight - (withName ? SLOT_LABEL_GAP + SLOT_LABEL_HEIGHT : 0);
  return Math.min(MAX_TILE_EXTENT, along, across);
}

/** The centre of the tile in the `slot`-th place — the figure's position in
 * the level's own list, which does not change as figures are placed — in
 * the same coordinates the tray itself is positioned in. */
export function trayTileCenter({
  slot,
  levelTrayCount,
  panel,
  withName = true,
}: {
  slot: number;
  levelTrayCount: number;
  /** The panel's outer box. */
  panel: { left: number; top: number; width: number; height: number };
  withName?: boolean;
}): { x: number; y: number } {
  const rowHeight = trayRowHeight(panel.height);
  const size = trayTileExtent(levelTrayCount, panel.width, rowHeight, withName);
  const slotExtent = withName ? trayTileExtent(levelTrayCount, panel.width) : size;
  const count = Math.max(1, levelTrayCount);
  const rowWidth = slotExtent * count + TILE_GAP * (count - 1);
  const contentLeft = panel.left + TRAY_INLINE_INSET;
  const contentWidth = panel.width - TRAY_INLINE_INSET * 2;
  const start = contentLeft + (contentWidth - rowWidth) / 2;
  const rowTop = panel.top + TRAY_METRICS.border + TRAY_METRICS.paddingTop
    + TRAY_METRICS.headerHeight + TRAY_METRICS.headerGap;
  const slotHeight = size + (withName ? SLOT_LABEL_GAP + SLOT_LABEL_HEIGHT : 0);
  return {
    x: start + Math.max(0, slot) * (slotExtent + TILE_GAP) + slotExtent / 2,
    y: rowTop + rowHeight / 2 - slotHeight / 2 + size / 2,
  };
}
