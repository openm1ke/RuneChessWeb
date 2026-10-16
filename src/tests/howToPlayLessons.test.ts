import { describe, expect, it } from 'vitest';
import { howToPlayLessons } from '../data/howToPlayLessons';
import { DozorEngine } from '../game/dozorEngine';

// The rules screen's lessons are played, not illustrated, so the one thing
// that makes them teachable is that they are solvable under today's rules.
describe('how-to-play lessons', () => {
  howToPlayLessons.forEach((lesson, index) => {
    const n = index + 1;

    it(`lesson ${n}: the reference solution solves it`, () => {
      const engine = new DozorEngine();
      engine.loadLesson(lesson.level);
      expect(lesson.solution).toHaveLength(lesson.level.tray.length);
      lesson.solution.forEach((cell, i) => {
        expect(engine.dropTrayItem(lesson.level.tray[i].id, cell.c, cell.r)).toBe(true);
      });
      expect(engine.snapshot().solved).toBe(true);
    });

    it(`lesson ${n}: solving it credits nothing`, () => {
      const engine = new DozorEngine();
      let solved = 0;
      let daily = 0;
      engine.onLevelSolved = () => solved++;
      engine.onDailyChallengeSolved = () => daily++;
      engine.loadLesson(lesson.level);
      expect(engine.isLesson).toBe(true);
      expect(engine.isDailyChallenge).toBe(false);
      lesson.solution.forEach((cell, i) => engine.dropTrayItem(lesson.level.tray[i].id, cell.c, cell.r));
      expect(engine.snapshot().solved).toBe(true);
      expect([solved, daily, engine.levelResult]).toEqual([0, 0, null]);
    });
  });
});
