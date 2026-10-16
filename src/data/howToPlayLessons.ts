import type { Cell, LevelDefinition } from '../game/models';

/**
 * The three positions the rules screen teaches on — the same three the app
 * uses (`lib/data/how_to_play_lessons.dart`), played on the real board with
 * the real engine through `DozorEngine.loadLesson`. A player shown a
 * picture of a beam has not seen a beam.
 *
 * Each carries a reference solution that `src/tests/howToPlayLessons.test.ts`
 * replays through the engine, so a rules change that made one unsolvable
 * fails a test instead of stranding a player on the screen that exists to
 * help them.
 */
export interface LessonScript {
  level: LevelDefinition;
  /** One arrangement that solves `level`: the cell for each tray item, in
   * tray order. Not shown to the player. */
  solution: Cell[];
}

/** One rune, one rook: a figure shoots, the rune counts. Every cell on
 * row 2 or column 3 solves it, so a first attempt almost cannot fail. */
export const lessonRay: LessonScript = {
  level: {
    boardSize: 6,
    beacons: [{ c: 3, r: 2, target: 1 }],
    tray: [{ id: 'howto-1-rook', type: 'rook' }],
  },
  solution: [{ c: 0, r: 2 }],
};

/** One rune asking for two: the rook cannot reach it diagonally and the
 * bishop cannot reach it straight, so two takes both patterns. */
export const lessonCount: LessonScript = {
  level: {
    boardSize: 6,
    beacons: [{ c: 2, r: 2, target: 2 }],
    tray: [
      { id: 'howto-2-rook', type: 'rook' },
      { id: 'howto-2-bishop', type: 'bishop' },
    ],
  },
  solution: [
    { c: 2, r: 5 },
    { c: 0, r: 0 },
  ],
};

/** Two runes, two bishops: the obvious bishop on (0,0) lights both runes at
 * once and leaves the second bishop nowhere to go. A beam runs until
 * something blocks it — finding that out is the lesson. */
export const lessonReach: LessonScript = {
  level: {
    boardSize: 6,
    beacons: [
      { c: 1, r: 1, target: 1 },
      { c: 4, r: 4, target: 1 },
    ],
    tray: [
      { id: 'howto-3-bishop-a', type: 'bishop' },
      { id: 'howto-3-bishop-b', type: 'bishop' },
    ],
  },
  solution: [
    { c: 0, r: 2 },
    { c: 5, r: 3 },
  ],
};

export const howToPlayLessons: readonly LessonScript[] = [lessonRay, lessonCount, lessonReach];
