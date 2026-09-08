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
const MAX_TILE_EXTENT = 64;
/** The panel's own horizontal padding, which the tile row cannot use. */
const TRAY_PADDING = 20;
/** Panel padding and header height, subtracted to find the row of tiles. */
const TRAY_PADDING_TOP = 8;
const TRAY_PADDING_BOTTOM = 10;
const TRAY_HEADER_HEIGHT = 21;

/** The portrait tray's box on the 430x932 design canvas. */
export const TRAY_PORTRAIT = { left: 96, right: 96, bottom: 120, height: 104 };

/** How tall the row of tiles is inside a panel `height` tall. */
export function trayRowHeight(height: number): number {
  return height - TRAY_PADDING_TOP - TRAY_HEADER_HEIGHT - TRAY_PADDING_BOTTOM;
}

/** The extent one tile takes, given how many the level started with — see
 * `Tray` for why it is the starting count and not the current one. */
export function trayTileExtent(levelTrayCount: number, panelExtent: number): number {
  const total = Math.max(1, levelTrayCount);
  return Math.min(MAX_TILE_EXTENT, (panelExtent - TRAY_PADDING - TILE_GAP * (total - 1)) / total);
}

/** The centre of the `index`-th tile currently in the tray, in the same
 * coordinates the tray itself is positioned in. */
export function trayTileCenter({
  index,
  visibleCount,
  levelTrayCount,
  panel,
}: {
  index: number;
  visibleCount: number;
  levelTrayCount: number;
  /** The panel's outer box. */
  panel: { left: number; top: number; width: number; height: number };
}): { x: number; y: number } {
  const size = trayTileExtent(levelTrayCount, panel.width);
  const count = Math.max(1, visibleCount);
  const rowWidth = size * count + TILE_GAP * (count - 1);
  const contentLeft = panel.left + TRAY_PADDING / 2;
  const contentWidth = panel.width - TRAY_PADDING;
  const start = contentLeft + (contentWidth - rowWidth) / 2;
  const rowTop = panel.top + TRAY_PADDING_TOP + TRAY_HEADER_HEIGHT;
  const rowHeight = panel.height - TRAY_PADDING_TOP - TRAY_HEADER_HEIGHT - TRAY_PADDING_BOTTOM;
  return {
    x: start + Math.max(0, index) * (size + TILE_GAP) + size / 2,
    y: rowTop + rowHeight / 2,
  };
}
