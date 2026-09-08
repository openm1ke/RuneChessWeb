/**
 * A look the player can put on the game: the table, the figures, the coins
 * and the colours painted between them. Port of the Flutter app's
 * `CosmeticSkin` — same ids, same files, same numbers, so a set added on one
 * platform is a copy-paste away on the other.
 *
 * The game draws its board in two halves that have to agree with each
 * other — the table *art*, and the cells drawn inside its frame through
 * `BoardPerspective`. A set whose art disagrees with that projection would
 * show its frame and the squares in different places, so alignment is
 * settled before the app ever runs: the sets' sprites are prepared by
 * `tool/prepare_cosmetics.py` in the Flutter repository, and the `derived/`
 * output is copied into `public/assets/images/cosmetics/<set>/`. What is
 * left here is what genuinely differs between sets — which files to draw,
 * what colour the squares are, and the small per-art corrections.
 *
 * Only the board, the figures and the coins are skinned today. The menu
 * backdrop, the tray panel and the buttons still come from the stylesheet.
 */
import { asset } from '../lib/assetUrl';
import type { PieceType } from './pieceTypes';

export interface CosmeticSkin {
  /** Stored in the player's preferences; never shown. */
  id: string;
  /** Shown on the appearance screen. */
  name: string;
  tagline: string;
  /** The table, drawn to fill the design canvas's top 430×764. */
  boardAsset: string;
  /**
   * The part of the table that belongs *in front of* the drawn squares: the
   * frame's gems and corner work lean in over the playing surface, and
   * without this the squares would slice them off along the field's edge.
   * Everything else in it is transparent. Null for a frame that overhangs
   * nothing.
   */
  boardFrameAsset: string | null;
  /** The landscape companion piece, when the set has one. */
  wideBoardAsset: string | null;
  /** The room the menu and every panel over it are set in: portrait, and
   * the wide painting landscape uses. */
  menuBackground: string;
  wideMenuBackground: string;
  /** A brighter version of the same room, breathed in and out under the
   * menu so the scene is not quite still. Null for a set without one,
   * which simply keeps still. */
  menuBackgroundLively: string | null;
  /** Painted behind everything, and around the table in landscape. */
  backdrop: string;
  /**
   * The two square colours. They are drawn over the art's own squares —
   * which are only ever decorative, since the board is 6×6 or 7×7 and no
   * art can know which — so they carry the whole readability of the
   * position: a figure has to stay legible on either of them.
   */
  lightCell: string;
  darkCell: string;
  /** The gradient carrying the table off the bottom of the screen. */
  tableFadeTop: string;
  tableFadeBottom: string;
  pieceAssets: Record<PieceType, string>;
  /** Coin faces 0–5, indexed by the number a beacon shows. */
  coinAssets: string[];
  /**
   * Some art is not drawn perfectly upright; this straightens it in place
   * (degrees). Zero for anything not listed.
   */
  uprightRotationDeg: Partial<Record<PieceType, number>>;
  /**
   * How strongly each figure carries a halo of its own type colour on the
   * board, 0–1. The classic set does not need one — its figures are already
   * six different colours — but a set carved from one material needs
   * something to separate figure from square, and to keep the colour that
   * tells a rook from a bishop everywhere else in the game.
   */
  pieceAmbientGlow: number;
}

const OBSIDIAN = 'assets/images/cosmetics/obsidian_astral';

export const classicSkin: CosmeticSkin = {
  id: 'classic',
  name: 'Классика',
  tagline: 'Дубовый стол и золочёная рама — то, с чего всё началось.',
  boardAsset: asset('assets/images/isometric-table.webp'),
  // The classic frame ends where the felt begins: nothing leans in.
  boardFrameAsset: null,
  wideBoardAsset: asset('assets/images/isometric-table-web-wide.webp'),
  menuBackground: asset('assets/images/menu-castle-bg-clean.webp'),
  wideMenuBackground: asset('assets/images/menu-castle-bg-web-wide.webp'),
  menuBackgroundLively: asset('assets/images/menu-castle-bg-living-bright.webp'),
  backdrop: '#05091a',
  lightCell: '#dbc49a',
  darkCell: '#1d2c55',
  tableFadeTop: '#160b08',
  tableFadeBottom: '#03050d',
  pieceAssets: {
    rook: asset('assets/images/p-rook-android.webp'),
    bishop: asset('assets/images/p-bishop-android.webp'),
    knight: asset('assets/images/p-knight-android.webp'),
    king: asset('assets/images/p-king-android.webp'),
    queen: asset('assets/images/p-queen-android.webp'),
    pawn: asset('assets/images/p-pawn-android.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/coin-${index}.webp`),
  ),
  // The king and the rook used to lean in the source art and were
  // straightened here; they are drawn upright now.
  uprightRotationDeg: {},
  pieceAmbientGlow: 0,
};

export const obsidianAstralSkin: CosmeticSkin = {
  id: 'obsidian_astral',
  name: 'Обсидиановый астрал',
  tagline: 'Чёрное стекло, золото и звёздная пыль внутри фигур.',
  boardAsset: asset(`${OBSIDIAN}/board.webp`),
  boardFrameAsset: asset(`${OBSIDIAN}/board-frame.webp`),
  wideBoardAsset: asset(`${OBSIDIAN}/board-wide.webp`),
  menuBackground: asset(`${OBSIDIAN}/menu.webp`),
  wideMenuBackground: asset(`${OBSIDIAN}/menu-wide.webp`),
  // One painting, no brighter twin: this room keeps still.
  menuBackgroundLively: null,
  backdrop: '#05070f',
  // Lifted well above the art's own squares (which are nearly black): the
  // figures are dark too, and on the real thing they disappeared.
  lightCell: '#34365f',
  darkCell: '#101124',
  tableFadeTop: '#0a070c',
  tableFadeBottom: '#03040a',
  pieceAssets: {
    rook: asset(`${OBSIDIAN}/rook.webp`),
    bishop: asset(`${OBSIDIAN}/bishop.webp`),
    knight: asset(`${OBSIDIAN}/knight.webp`),
    king: asset(`${OBSIDIAN}/king.webp`),
    queen: asset(`${OBSIDIAN}/queen.webp`),
    pawn: asset(`${OBSIDIAN}/pawn.webp`),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`${OBSIDIAN}/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0.34,
};

export const woodenWorkshopSkin: CosmeticSkin = {
  id: 'wooden_set',
  name: 'Деревянная мастерская',
  tagline: 'Морёный дуб, зелёное сукно и фигуры, крашенные вручную.',
  boardAsset: asset('assets/images/cosmetics/wooden_set/board.webp'),
  boardFrameAsset: asset('assets/images/cosmetics/wooden_set/board-frame.webp'),
  wideBoardAsset: asset('assets/images/cosmetics/wooden_set/board-wide.webp'),
  menuBackground: asset('assets/images/cosmetics/wooden_set/menu.webp'),
  wideMenuBackground: asset('assets/images/cosmetics/wooden_set/menu-wide.webp'),
  menuBackgroundLively: null,
  backdrop: '#140a05',
  lightCell: '#e8d5ae',
  darkCell: '#5c3a24',
  tableFadeTop: '#271004',
  tableFadeBottom: '#0b0602',
  pieceAssets: {
    rook: asset('assets/images/cosmetics/wooden_set/rook.webp'),
    bishop: asset('assets/images/cosmetics/wooden_set/bishop.webp'),
    knight: asset('assets/images/cosmetics/wooden_set/knight.webp'),
    king: asset('assets/images/cosmetics/wooden_set/king.webp'),
    queen: asset('assets/images/cosmetics/wooden_set/queen.webp'),
    pawn: asset('assets/images/cosmetics/wooden_set/pawn.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/cosmetics/wooden_set/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0,
};

export const pearlTideSkin: CosmeticSkin = {
  id: 'pearl_tide',
  name: 'Жемчужная',
  tagline: 'Перламутр, морская синь и фигуры, гладкие как раковина.',
  boardAsset: asset('assets/images/cosmetics/pearl_tide/board.webp'),
  boardFrameAsset: asset('assets/images/cosmetics/pearl_tide/board-frame.webp'),
  wideBoardAsset: asset('assets/images/cosmetics/pearl_tide/board-wide.webp'),
  menuBackground: asset('assets/images/cosmetics/pearl_tide/menu.webp'),
  wideMenuBackground: asset('assets/images/cosmetics/pearl_tide/menu-wide.webp'),
  menuBackgroundLively: null,
  backdrop: '#080e1a',
  lightCell: '#e2e8f0',
  darkCell: '#28426e',
  tableFadeTop: '#0e1826',
  tableFadeBottom: '#04070e',
  pieceAssets: {
    rook: asset('assets/images/cosmetics/pearl_tide/rook.webp'),
    bishop: asset('assets/images/cosmetics/pearl_tide/bishop.webp'),
    knight: asset('assets/images/cosmetics/pearl_tide/knight.webp'),
    king: asset('assets/images/cosmetics/pearl_tide/king.webp'),
    queen: asset('assets/images/cosmetics/pearl_tide/queen.webp'),
    pawn: asset('assets/images/cosmetics/pearl_tide/pawn.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/cosmetics/pearl_tide/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0,
};

export const moonlitSilverSkin: CosmeticSkin = {
  id: 'moonlit_silver',
  name: 'Лунное серебро',
  tagline: 'Кованое серебро, ночная синева и холодный лунный блеск.',
  boardAsset: asset('assets/images/cosmetics/moonlit_silver/board.webp'),
  boardFrameAsset: asset('assets/images/cosmetics/moonlit_silver/board-frame.webp'),
  wideBoardAsset: asset('assets/images/cosmetics/moonlit_silver/board-wide.webp'),
  menuBackground: asset('assets/images/cosmetics/moonlit_silver/menu.webp'),
  wideMenuBackground: asset('assets/images/cosmetics/moonlit_silver/menu-wide.webp'),
  menuBackgroundLively: null,
  backdrop: '#070c16',
  lightCell: '#a0b0c8',
  darkCell: '#1a2640',
  tableFadeTop: '#0b1524',
  tableFadeBottom: '#03060c',
  pieceAssets: {
    rook: asset('assets/images/cosmetics/moonlit_silver/rook.webp'),
    bishop: asset('assets/images/cosmetics/moonlit_silver/bishop.webp'),
    knight: asset('assets/images/cosmetics/moonlit_silver/knight.webp'),
    king: asset('assets/images/cosmetics/moonlit_silver/king.webp'),
    queen: asset('assets/images/cosmetics/moonlit_silver/queen.webp'),
    pawn: asset('assets/images/cosmetics/moonlit_silver/pawn.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/cosmetics/moonlit_silver/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0,
};

export const lavaForgeSkin: CosmeticSkin = {
  id: 'lava_forge',
  name: 'Лавовая кузница',
  tagline: 'Остывший базальт с трещинами, за которыми ещё горит.',
  boardAsset: asset('assets/images/cosmetics/lava_forge/board.webp'),
  boardFrameAsset: asset('assets/images/cosmetics/lava_forge/board-frame.webp'),
  wideBoardAsset: asset('assets/images/cosmetics/lava_forge/board-wide.webp'),
  menuBackground: asset('assets/images/cosmetics/lava_forge/menu.webp'),
  wideMenuBackground: asset('assets/images/cosmetics/lava_forge/menu-wide.webp'),
  menuBackgroundLively: null,
  backdrop: '#0c0705',
  lightCell: '#967864',
  darkCell: '#3a2a24',
  tableFadeTop: '#170b06',
  tableFadeBottom: '#060302',
  pieceAssets: {
    rook: asset('assets/images/cosmetics/lava_forge/rook.webp'),
    bishop: asset('assets/images/cosmetics/lava_forge/bishop.webp'),
    knight: asset('assets/images/cosmetics/lava_forge/knight.webp'),
    king: asset('assets/images/cosmetics/lava_forge/king.webp'),
    queen: asset('assets/images/cosmetics/lava_forge/queen.webp'),
    pawn: asset('assets/images/cosmetics/lava_forge/pawn.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/cosmetics/lava_forge/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0.22,
};

export const amberWorkshopSkin: CosmeticSkin = {
  id: 'amber_workshop',
  name: 'Янтарная мастерская',
  tagline: 'Тёплый янтарь, латунь и стружка на верстаке.',
  boardAsset: asset('assets/images/cosmetics/amber_workshop/board.webp'),
  boardFrameAsset: asset('assets/images/cosmetics/amber_workshop/board-frame.webp'),
  wideBoardAsset: asset('assets/images/cosmetics/amber_workshop/board-wide.webp'),
  menuBackground: asset('assets/images/cosmetics/amber_workshop/menu.webp'),
  wideMenuBackground: asset('assets/images/cosmetics/amber_workshop/menu-wide.webp'),
  menuBackgroundLively: null,
  backdrop: '#120a04',
  lightCell: '#eece96',
  darkCell: '#5c3416',
  tableFadeTop: '#1a0c04',
  tableFadeBottom: '#070301',
  pieceAssets: {
    rook: asset('assets/images/cosmetics/amber_workshop/rook.webp'),
    bishop: asset('assets/images/cosmetics/amber_workshop/bishop.webp'),
    knight: asset('assets/images/cosmetics/amber_workshop/knight.webp'),
    king: asset('assets/images/cosmetics/amber_workshop/king.webp'),
    queen: asset('assets/images/cosmetics/amber_workshop/queen.webp'),
    pawn: asset('assets/images/cosmetics/amber_workshop/pawn.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/cosmetics/amber_workshop/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0,
};

export const gzhelPorcelainSkin: CosmeticSkin = {
  id: 'gzhel_porcelain',
  name: 'Гжельский фарфор',
  tagline: 'Белый фарфор с кобальтовой росписью, как сервиз из серванта.',
  boardAsset: asset('assets/images/cosmetics/gzhel_porcelain/board.webp'),
  boardFrameAsset: asset('assets/images/cosmetics/gzhel_porcelain/board-frame.webp'),
  wideBoardAsset: asset('assets/images/cosmetics/gzhel_porcelain/board-wide.webp'),
  menuBackground: asset('assets/images/cosmetics/gzhel_porcelain/menu.webp'),
  wideMenuBackground: asset('assets/images/cosmetics/gzhel_porcelain/menu-wide.webp'),
  menuBackgroundLively: null,
  backdrop: '#060c1c',
  lightCell: '#e2eaf7',
  darkCell: '#263e78',
  tableFadeTop: '#0a1428',
  tableFadeBottom: '#03060e',
  pieceAssets: {
    rook: asset('assets/images/cosmetics/gzhel_porcelain/rook.webp'),
    bishop: asset('assets/images/cosmetics/gzhel_porcelain/bishop.webp'),
    knight: asset('assets/images/cosmetics/gzhel_porcelain/knight.webp'),
    king: asset('assets/images/cosmetics/gzhel_porcelain/king.webp'),
    queen: asset('assets/images/cosmetics/gzhel_porcelain/queen.webp'),
    pawn: asset('assets/images/cosmetics/gzhel_porcelain/pawn.webp'),
  },
  coinAssets: [0, 1, 2, 3, 4, 5].map((index) =>
    asset(`assets/images/cosmetics/gzhel_porcelain/coin-${index}.webp`),
  ),
  uprightRotationDeg: {},
  pieceAmbientGlow: 0,
};

/** Every set the player can pick, in the order the appearance screen shows. */
export const cosmeticSkins: readonly CosmeticSkin[] = [
  classicSkin,
  obsidianAstralSkin,
  woodenWorkshopSkin,
  pearlTideSkin,
  moonlitSilverSkin,
  lavaForgeSkin,
  amberWorkshopSkin,
  gzhelPorcelainSkin,
];

/** The set stored under `id`, or the classic one for anything unknown — a
 * set removed in a later build must not leave the game unplayable. */
export function skinById(id: string | null | undefined): CosmeticSkin {
  return cosmeticSkins.find((skin) => skin.id === id) ?? classicSkin;
}

export function coinAsset(skin: CosmeticSkin, target: number): string {
  const index = Math.min(Math.max(target, 0), skin.coinAssets.length - 1);
  return skin.coinAssets[index];
}

export function uprightRotationOf(skin: CosmeticSkin, type: PieceType): number {
  return skin.uprightRotationDeg[type] ?? 0;
}
