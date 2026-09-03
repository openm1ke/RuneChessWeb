import type { Cell, LevelDefinition } from '../game/models';
import type { PawnDirection, PieceType } from '../game/pieceTypes';
import raw from './campaignLevelsData.json';

interface RawTrayItem {
  id: string;
  type: PieceType;
  pawnDirection: 'none' | PawnDirection;
}
interface RawBeacon {
  c: number;
  r: number;
  target: number;
}
interface RawLevel {
  beacons: RawBeacon[];
  tray: RawTrayItem[];
  boardSize?: number;
}
interface RawCell {
  c: number;
  r: number;
}
interface RawDump {
  levels: RawLevel[];
  solutions: RawCell[][];
}

const dump = raw as RawDump;

/**
 * Every campaign level (1-165), dumped verbatim from the Flutter app's
 * `kTutorialLevels` — see `web/WEB_PORT_PLAN.md` for why this is a data dump
 * rather than a reimplemented generator (Dart's `math.Random` algorithm does
 * not port bit-for-bit to JavaScript). Levels 1-112 are the original 6×6
 * campaign (`boardSize` absent in the dump, defaults to 6 below); levels
 * 113-165 are the bonus 7×7 continuation campaign, added the same way.
 */
export const campaignLevels: LevelDefinition[] = dump.levels.map((level) => ({
  beacons: level.beacons.map((b) => ({ c: b.c, r: b.r, target: b.target })),
  tray: level.tray.map((t) => ({
    id: t.id,
    type: t.type,
    pawnDirection: t.pawnDirection === 'none' ? undefined : t.pawnDirection,
  })),
  boardSize: level.boardSize ?? 6,
}));

/** One known solution per campaign level, positionally aligned with `campaignLevels`. */
export const campaignSolutions: Cell[][] = dump.solutions.map((solution) =>
  solution.map((cell) => ({ c: cell.c, r: cell.r })),
);

/** The number of the first level that earns stars (tutorial levels 0-4 don't). */
export const FIRST_SCORED_LEVEL_INDEX = 5;

/** Number of levels in the shipped 6×6 campaign (tutorial + main). Levels
 * from this index on form the bonus 7×7 continuation campaign. */
export const MAIN_CAMPAIGN_LEVEL_COUNT = 112;
