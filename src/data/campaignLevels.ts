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
 * Every campaign level (1-112), dumped verbatim from the Flutter app's
 * `kTutorialLevels` — see `web/WEB_PORT_PLAN.md` for why this is a data dump
 * rather than a reimplemented generator (Dart's `math.Random` algorithm does
 * not port bit-for-bit to JavaScript).
 */
export const campaignLevels: LevelDefinition[] = dump.levels.map((level) => ({
  beacons: level.beacons.map((b) => ({ c: b.c, r: b.r, target: b.target })),
  tray: level.tray.map((t) => ({
    id: t.id,
    type: t.type,
    pawnDirection: t.pawnDirection === 'none' ? undefined : t.pawnDirection,
  })),
}));

/** One known solution per campaign level, positionally aligned with `campaignLevels`. */
export const campaignSolutions: Cell[][] = dump.solutions.map((solution) =>
  solution.map((cell) => ({ c: cell.c, r: cell.r })),
);

/** The number of the first level that earns stars (tutorial levels 0-4 don't). */
export const FIRST_SCORED_LEVEL_INDEX = 5;
