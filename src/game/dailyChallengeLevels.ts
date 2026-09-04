import { computeAttacks } from './attackRules';
import type { Cell, LevelDefinition, TrayItem } from './models';
import { cellKey } from './models';
import type { PieceType } from './pieceTypes';
import { ALL_PIECE_TYPES } from './pieceTypes';

/** The daily challenge always plays on the 7x7 board — only that board
 * supports the 0 ("empty rune") and 5 ("full rune") coin targets used by
 * the harder days of the week (see docs/DAILY_CHALLENGE_PLAN.md). */
export const DAILY_CHALLENGE_BOARD_SIZE = 7;

/** Day zero of the daily challenge. `dailyChallengeDayIndex` counts whole
 * calendar days from this date to seed the generator — never change this
 * without invalidating every already-played daily result. Deliberately a
 * different epoch from the mobile app: the two platforms have entirely
 * separate saves and generators (JS's PRNG cannot reproduce Dart's
 * `math.Random` bit-for-bit — see `campaignLevels.ts`'s doc comment for the
 * same reasoning on the static campaign), so there is no cross-platform
 * parity to preserve. */
const DAILY_CHALLENGE_EPOCH = new Date(2026, 0, 1);

/** Number of whole local calendar days between the epoch and `date`,
 * ignoring the time-of-day component of both. Local time, not UTC. */
export function dailyChallengeDayIndex(date: Date): number {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const epochDay = new Date(
    DAILY_CHALLENGE_EPOCH.getFullYear(),
    DAILY_CHALLENGE_EPOCH.getMonth(),
    DAILY_CHALLENGE_EPOCH.getDate(),
  );
  return Math.round((day.getTime() - epochDay.getTime()) / 86_400_000);
}

/** A generated daily-challenge puzzle: the level itself plus one known
 * working solution (positionally aligned with `level.tray`). */
export interface DailyChallengeLevel {
  level: LevelDefinition;
  solution: Cell[];
}

/** The best saved result for one calendar day's daily challenge — mirrors
 * `levelStars`, but keyed by date instead of level index. */
export interface DailyChallengeResult {
  stars: number;
  hintsUsed: number;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** The `yyyy-MM-dd` local-calendar-day key every daily-challenge result is
 * stored and looked up under. */
export function dailyChallengeKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

interface DailySpec {
  types: PieceType[];
  beaconCount: number;
  requiredOverlaps: number;
  maxTarget: number;
  zeroBeaconCount?: number;
  requireMaxTargetBeacon?: boolean;
}

/** One spec per weekday, Monday (index 0) through Sunday (index 6),
 * escalating difficulty across the week: the empty rune (target 0) first
 * appears mid-week, the full rune (target 5) only on the two hardest days. */
const DAILY_CHALLENGE_SPECS: DailySpec[] = [
  // Monday — gentlest: 3 pieces, no overlaps required, no 0/5.
  { types: ['rook', 'bishop', 'knight'], beaconCount: 3, requiredOverlaps: 0, maxTarget: 2 },
  // Tuesday — the queen joins, one overlap required.
  { types: ['queen', 'rook', 'bishop'], beaconCount: 4, requiredOverlaps: 1, maxTarget: 3 },
  // Wednesday — the empty rune's first appearance.
  {
    types: ['queen', 'king', 'rook', 'knight'],
    beaconCount: 5,
    requiredOverlaps: 1,
    maxTarget: 3,
    zeroBeaconCount: 1,
  },
  // Thursday — the pawn joins, denser overlaps.
  {
    types: ['queen', 'king', 'bishop', 'knight', 'pawn'],
    beaconCount: 5,
    requiredOverlaps: 2,
    maxTarget: 4,
    zeroBeaconCount: 1,
  },
  // Friday — five pieces, two empty runes.
  {
    types: ['queen', 'king', 'rook', 'bishop', 'pawn'],
    beaconCount: 6,
    requiredOverlaps: 2,
    maxTarget: 4,
    zeroBeaconCount: 2,
  },
  // Saturday — the full rune's first appearance: every piece must attack one coin at once.
  {
    types: ['queen', 'king', 'rook', 'knight', 'pawn', 'pawn'],
    beaconCount: 6,
    requiredOverlaps: 3,
    maxTarget: 5,
    zeroBeaconCount: 2,
    requireMaxTargetBeacon: true,
  },
  // Sunday — the hardest day: full six-piece roster, three empty runes.
  {
    types: ['queen', 'king', 'rook', 'bishop', 'knight', 'pawn'],
    beaconCount: 7,
    requiredOverlaps: 3,
    maxTarget: 5,
    zeroBeaconCount: 3,
    requireMaxTargetBeacon: true,
  },
];

const DAILY_SEED_BASE = 9_000_001;
const DAILY_INDEX_COEFFICIENT = 733;
const DAILY_ATTEMPT_COEFFICIENT = 5303;
const DAILY_MAX_ATTEMPTS = 20_000;

/** A small, fast, deterministic PRNG (mulberry32) — seeded once per attempt
 * from the day index and attempt number, exactly mirroring the mobile
 * generator's structure even though the underlying RNG algorithm differs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, bound: number): number {
  return Math.floor(rng() * bound);
}

function shuffle<T>(array: T[], rng: () => number): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface PlacedPiece {
  type: PieceType;
  cell: Cell;
}

/** Deterministically generates the daily-challenge puzzle for `date`'s local
 * calendar day. Calling this twice with the same calendar day (any
 * time-of-day) always returns an identical level and solution; different
 * days almost always differ, since each draws its own random attempts. */
export function dailyChallengeLevel(date: Date): DailyChallengeLevel {
  const dayIndex = dailyChallengeDayIndex(date);
  // JS `Date.getDay()`: Sunday=0..Saturday=6 — remap to Monday=0..Sunday=6
  // to index into `DAILY_CHALLENGE_SPECS`.
  const weekday = (date.getDay() + 6) % 7;
  const spec = DAILY_CHALLENGE_SPECS[weekday];
  const boardSize = DAILY_CHALLENGE_BOARD_SIZE;

  for (let attempt = 0; attempt < DAILY_MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32(
      DAILY_SEED_BASE + dayIndex * DAILY_INDEX_COEFFICIENT + attempt * DAILY_ATTEMPT_COEFFICIENT,
    );
    const occupied = new Set<string>();
    const pieces: PlacedPiece[] = [];
    for (const type of spec.types) {
      let placed: PlacedPiece | null = null;
      for (let tries = 0; tries < 400 && placed == null; tries++) {
        const cell: Cell = { c: randomInt(rng, boardSize), r: randomInt(rng, boardSize) };
        const key = cellKey(cell.c, cell.r);
        if (occupied.has(key)) continue;
        if (type === 'pawn') {
          // Keep both forward diagonals on the board: not on the top row
          // (the pawn always attacks upward) and not on a side column.
          if (cell.r === 0 || cell.c === 0 || cell.c === boardSize - 1) continue;
        }
        occupied.add(key);
        placed = { type, cell };
      }
      if (placed == null) break;
      pieces.push(placed);
    }
    if (pieces.length !== spec.types.length) continue;

    const hits: Cell[][] = pieces.map((piece) =>
      computeAttacks({ type: piece.type, c: piece.cell.c, r: piece.cell.r, occupied, boardN: boardSize }),
    );
    let tooFew = false;
    for (let i = 0; i < pieces.length; i++) {
      const minHits = pieces[i].type === 'pawn' ? 2 : 3;
      if (hits[i].length < minHits) {
        tooFew = true;
        break;
      }
    }
    if (tooFew) continue;

    const owners = new Map<string, Set<number>>();
    const cellsByKey = new Map<string, Cell>();
    for (let i = 0; i < hits.length; i++) {
      for (const cell of hits[i]) {
        const key = cellKey(cell.c, cell.r);
        if (occupied.has(key)) continue;
        cellsByKey.set(key, cell);
        if (!owners.has(key)) owners.set(key, new Set());
        owners.get(key)!.add(i);
      }
    }
    const available = shuffle([...owners.keys()], rng);
    if (available.length < spec.beaconCount) continue;

    const selected = new Set<string>();
    for (let i = 0; i < pieces.length; i++) {
      const choices = available
        .filter((key) => owners.get(key)!.has(i) && !selected.has(key))
        .sort((a, b) => owners.get(b)!.size - owners.get(a)!.size);
      if (choices.length === 0) break;
      selected.add(choices[0]);
    }
    if (selected.size < pieces.length) continue;

    let overlapCount = [...selected].filter((key) => owners.get(key)!.size > 1).length;
    for (const key of available.filter((k) => owners.get(k)!.size > 1)) {
      if (overlapCount >= spec.requiredOverlaps || selected.size >= spec.beaconCount) break;
      if (!selected.has(key)) {
        selected.add(key);
        overlapCount++;
      }
    }
    for (const key of available) {
      if (selected.size >= spec.beaconCount) break;
      selected.add(key);
    }
    if (selected.size !== spec.beaconCount || overlapCount < spec.requiredOverlaps) continue;

    const selectedCells = [...selected]
      .map((key) => cellsByKey.get(key)!)
      .sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
    const targets = selectedCells.map((cell) => owners.get(cellKey(cell.c, cell.r))!.size);
    if (targets.some((target) => target > spec.maxTarget)) continue;
    if (spec.requireMaxTargetBeacon && !targets.includes(spec.maxTarget)) continue;

    let zeroCells: Cell[] = [];
    const zeroBeaconCount = spec.zeroBeaconCount ?? 0;
    if (zeroBeaconCount > 0) {
      const cs = pieces.map((p) => p.cell.c);
      const rs = pieces.map((p) => p.cell.r);
      const minC = Math.min(...cs);
      const maxC = Math.max(...cs);
      const minR = Math.min(...rs);
      const maxR = Math.max(...rs);
      const zeroCandidates: Cell[] = [];
      for (let r = Math.max(0, minR - 1); r <= Math.min(boardSize - 1, maxR + 1); r++) {
        for (let c = Math.max(0, minC - 1); c <= Math.min(boardSize - 1, maxC + 1); c++) {
          const key = cellKey(c, r);
          if (occupied.has(key) || owners.has(key)) continue;
          zeroCandidates.push({ c, r });
        }
      }
      if (zeroCandidates.length < zeroBeaconCount) continue;
      zeroCells = shuffle(zeroCandidates, rng)
        .slice(0, zeroBeaconCount)
        .sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
    }

    const typeOccurrences: Partial<Record<PieceType, number>> = {};
    for (const type of ALL_PIECE_TYPES) {
      typeOccurrences[type] = spec.types.filter((t) => t === type).length;
    }
    const typeSeen: Partial<Record<PieceType, number>> = {};
    const idPrefix = `daily-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const trayItems: TrayItem[] = pieces.map((piece) => {
      const occurrence = (typeSeen[piece.type] ?? 0) + 1;
      typeSeen[piece.type] = occurrence;
      const suffix = (typeOccurrences[piece.type] ?? 0) > 1 ? `-${occurrence}` : '';
      return {
        id: `${idPrefix}-${piece.type}${suffix}`,
        type: piece.type,
        pawnDirection: piece.type === 'pawn' ? 'up' : undefined,
      };
    });

    return {
      level: {
        boardSize,
        beacons: [
          ...selectedCells.map((cell, i) => ({ c: cell.c, r: cell.r, target: targets[i] })),
          ...zeroCells.map((cell) => ({ c: cell.c, r: cell.r, target: 0 })),
        ],
        tray: trayItems,
      },
      solution: pieces.map((p) => p.cell),
    };
  }
  throw new Error(`Could not generate a daily challenge level for ${date.toISOString()}`);
}
