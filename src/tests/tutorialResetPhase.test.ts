// The fifth lesson teaches by letting the player overshoot: place the two
// pieces the obvious way, watch a coin light up more times than it asks
// for, reset, and do it properly. The reset is a step forward through the
// lesson — the only lesson where it is.
//
// `resetLevel` rebuilt the level through `loadLevel`, which rewinds
// `lessonPhase` to `trial`, so the coach mark came back pointing at the
// square that had just overshot. Mirrors the app's
// test/tutorial_reset_phase_test.dart.
import { describe, expect, it } from 'vitest';
import { DozorEngine, FIRST_SCORED_LEVEL_INDEX } from '../game/dozorEngine';

const FIFTH_LESSON = FIRST_SCORED_LEVEL_INDEX - 1;

describe('the fifth lesson across a reset', () => {
  it('a reset after the overshoot asks for the real solution', () => {
    const engine = new DozorEngine();
    engine.goToLevel(FIFTH_LESSON);
    expect(engine.lessonPhase).toBe('trial');

    engine.lessonPhase = 'overflow';
    engine.resetLevel();

    // Not `trial`: the board is empty again, but the lesson is not.
    expect(engine.lessonPhase).toBe('solution');
  });

  it('a reset before the overshoot leaves the lesson where it was', () => {
    const engine = new DozorEngine();
    engine.goToLevel(FIFTH_LESSON);

    engine.resetLevel();

    expect(engine.lessonPhase).toBe('trial');
  });

  it('the reset count still survives the reset', () => {
    const engine = new DozorEngine();
    engine.goToLevel(FIFTH_LESSON);

    engine.resetLevel();
    engine.resetLevel();

    expect(engine.resetCount).toBe(2);
  });

  it('leaving the level for another one starts its lesson over', () => {
    const engine = new DozorEngine();
    engine.goToLevel(FIFTH_LESSON);
    engine.lessonPhase = 'solution';

    engine.goToLevel(0);
    engine.goToLevel(FIFTH_LESSON);

    expect(engine.lessonPhase).toBe('trial');
  });
});
