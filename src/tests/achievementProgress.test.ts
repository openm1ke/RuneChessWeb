import { describe, expect, it } from 'vitest';
import {
  advanceStreak,
  finalizePending,
  initialAchievementProgress,
  initialStreak,
  recordBonusStarApplied,
  recordHintUsed,
  recordLevelSolved,
  recordReset,
  type AchievementProgressState,
} from '../game/achievementProgress';
import type { LevelAttemptResult } from '../game/starRating';

function result(overrides: Partial<LevelAttemptResult> = {}): LevelAttemptResult {
  return { stars: 3, elapsedSeconds: 10, moveCount: 5, hintUsedCount: 0, ...overrides };
}

describe('advanceStreak', () => {
  it('extends the streak when the level continues it', () => {
    const streak = advanceStreak({ lastLevel: 9, length: 3 }, 10, true);
    expect(streak).toEqual({ lastLevel: 10, length: 4 });
  });

  it('starts a fresh streak of 1 from any eligible level that is not the continuation', () => {
    const streak = advanceStreak({ lastLevel: 9, length: 3 }, 20, true);
    expect(streak).toEqual({ lastLevel: 20, length: 1 });
  });

  it('breaks the streak only when the ineligible level was the attempted continuation', () => {
    const broken = advanceStreak({ lastLevel: 9, length: 3 }, 10, false);
    expect(broken).toEqual(initialStreak);
  });

  it('leaves the streak untouched when an ineligible level was not the continuation', () => {
    const untouched = advanceStreak({ lastLevel: 9, length: 3 }, 20, false);
    expect(untouched).toEqual({ lastLevel: 9, length: 3 });
  });
});

describe('recordLevelSolved', () => {
  it('grows both streaks together on a no-hint 3-star continuation', () => {
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result());
    expect(state.cleanStreak).toEqual({ lastLevel: 6, length: 2 });
    expect(state.perfectStreak).toEqual({ lastLevel: 6, length: 2 });
    expect([...state.noHintLevels].sort()).toEqual([5, 6]);
  });

  it('a hint breaks the clean streak and disqualifies the perfect streak with no pending window', () => {
    // Which levels used a hint is tracked separately, via `recordHintUsed`
    // on the actual hint-tap event — `recordLevelSolved` only reads
    // `result.hintUsedCount` to decide streak eligibility here.
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result({ hintUsedCount: 1, stars: 1 }));
    expect(state.cleanStreak).toEqual(initialStreak);
    expect(state.perfectStreak).toEqual(initialStreak);
    expect(state.pendingPerfectLevel).toBeNull();
  });

  it('a no-hint sub-3-star completion opens a pending window without touching the perfect streak yet', () => {
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result({ stars: 2 }));
    expect(state.cleanStreak).toEqual({ lastLevel: 6, length: 2 });
    expect(state.perfectStreak).toEqual({ lastLevel: 5, length: 1 });
    expect(state.pendingPerfectLevel).toBe(6);
    expect(state.pendingPerfectWasNext).toBe(true);
  });
});

describe('bonus star rescue', () => {
  it('a bonus star raising the pending level to 3 stars continues the perfect streak', () => {
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result({ stars: 2 }));
    state = recordBonusStarApplied(state, 6, 3);
    expect(state.perfectStreak).toEqual({ lastLevel: 6, length: 2 });
    expect(state.pendingPerfectLevel).toBeNull();
  });

  it('is a no-op for a level that is not the currently pending one', () => {
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result({ stars: 2 }));
    const before = state;
    state = recordBonusStarApplied(state, 99, 3);
    expect(state).toBe(before);
  });

  it('finalizePending breaks the streak if the window closes without a rescue and the level was the continuation', () => {
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result({ stars: 2 }));
    state = finalizePending(state);
    expect(state.perfectStreak).toEqual(initialStreak);
    expect(state.pendingPerfectLevel).toBeNull();
  });

  it('finalizePending leaves an unrelated perfect streak untouched if the pending level was not its continuation', () => {
    let state: AchievementProgressState = {
      ...initialAchievementProgress,
      perfectStreak: { lastLevel: 40, length: 12 },
    };
    state = recordLevelSolved(state, 6, result({ stars: 2 }));
    expect(state.pendingPerfectWasNext).toBe(false);
    state = finalizePending(state);
    expect(state.perfectStreak).toEqual({ lastLevel: 40, length: 12 });
  });
});

describe('recordReset', () => {
  it('unconditionally breaks both streaks and clears any pending window', () => {
    let state = initialAchievementProgress;
    state = recordLevelSolved(state, 5, result());
    state = recordLevelSolved(state, 6, result({ stars: 2 }));
    state = recordReset(state);
    expect(state.cleanStreak).toEqual(initialStreak);
    expect(state.perfectStreak).toEqual(initialStreak);
    expect(state.pendingPerfectLevel).toBeNull();
  });
});

describe('recordHintUsed', () => {
  it('is idempotent for the same level', () => {
    let state = initialAchievementProgress;
    state = recordHintUsed(state, 7);
    const after = recordHintUsed(state, 7);
    expect(after).toBe(state);
    expect(after.hintedLevels.size).toBe(1);
  });
});
