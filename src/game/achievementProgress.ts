import type { LevelAttemptResult } from './starRating';

/** A single "N levels in a row" counter — see docs/ACHIEVEMENTS_SPEC.md
 * (Flutter repo), "Правила серий". Only the last successfully-counted level
 * number and the current run length need to be kept; the rule "next level
 * must be exactly one higher" is entirely reconstructible from `lastLevel`
 * alone. */
export interface StreakState {
  lastLevel: number | null;
  length: number;
}

export const initialStreak: StreakState = { lastLevel: null, length: 0 };

/** Advances (or starts, or leaves untouched, or breaks) a streak given a
 * completed `levelIndex` and whether that completion is `eligible` for this
 * particular streak (e.g. "no hint used" for the clean streak, or
 * additionally "3 stars" for the perfect streak).
 *
 * - An eligible completion that continues the run (`levelIndex` is exactly
 *   `lastLevel + 1`) extends it by one.
 * - An eligible completion anywhere else starts a fresh run of length 1 at
 *   `levelIndex` — "начать серию можно с любого уровня".
 * - An *ineligible* completion that was the attempted continuation breaks
 *   the run back to empty.
 * - An ineligible completion anywhere else leaves the run untouched — it
 *   was never part of this attempt in the first place.
 */
export function advanceStreak(streak: StreakState, levelIndex: number, eligible: boolean): StreakState {
  const isNext = streak.lastLevel != null && levelIndex === streak.lastLevel + 1;
  if (eligible) {
    return { lastLevel: levelIndex, length: isNext ? streak.length + 1 : 1 };
  }
  return isNext ? initialStreak : streak;
}

/** Durable, replay-independent state backing the coin/шар achievements that
 * need more than "best stars per level" — see docs/ACHIEVEMENTS_SPEC.md
 * (Flutter repo). Every mutator returns a new, immutable instance so the
 * transition rules are trivially unit-testable without a running game
 * screen — a straight port of the Flutter `AchievementProgressState`. */
export interface AchievementProgressState {
  /** Levels where a hint was taken at least once — монета 0/1. */
  hintedLevels: ReadonlySet<number>;
  /** Levels completed at least once without a hint — монета 2. */
  noHintLevels: ReadonlySet<number>;
  /** Consecutive levels completed without a hint or a reset, regardless of
   * star count — монета 3 (≥50) and монета 4 (≥100). */
  cleanStreak: StreakState;
  /** Consecutive levels completed without a hint or a reset *and* on 3
   * stars — шар с ферзём (≥100). */
  perfectStreak: StreakState;
  /** A level that was just completed without a hint but below 3 stars,
   * whose fate for `perfectStreak` is not decided yet — a "звезда за
   * рекламу" grant may still raise it to 3 before the player leaves the
   * results screen. `null` when nothing is pending. */
  pendingPerfectLevel: number | null;
  /** Whether completing `pendingPerfectLevel` at 3 stars would have
   * continued `perfectStreak` (as opposed to starting a fresh one) —
   * captured at the moment the level went pending, since `perfectStreak`
   * itself may have already changed by the time the window closes. */
  pendingPerfectWasNext: boolean;
}

export const initialAchievementProgress: AchievementProgressState = {
  hintedLevels: new Set(),
  noHintLevels: new Set(),
  cleanStreak: initialStreak,
  perfectStreak: initialStreak,
  pendingPerfectLevel: null,
  pendingPerfectWasNext: false,
};

/** Records a hint taken on `levelIndex`, independent of whether the level
 * is ever completed. Callers are expected to filter out tutorial levels
 * before calling this — see docs/ACHIEVEMENTS_SPEC.md's "Подсказки
 * обучения не учитываются". */
export function recordHintUsed(state: AchievementProgressState, levelIndex: number): AchievementProgressState {
  if (state.hintedLevels.has(levelIndex)) return state;
  return { ...state, hintedLevels: new Set(state.hintedLevels).add(levelIndex) };
}

/** Resolves an outstanding bonus-star window for a level that never
 * reached 3 stars. Must be called before processing a solve/reset for any
 * *different* level — once that happens the earlier attempt's result
 * screen is gone and no further bonus star can ever raise it. */
export function finalizePending(state: AchievementProgressState): AchievementProgressState {
  if (state.pendingPerfectLevel == null) return state;
  const perfectStreak = state.pendingPerfectWasNext ? initialStreak : state.perfectStreak;
  return { ...state, perfectStreak, pendingPerfectLevel: null, pendingPerfectWasNext: false };
}

/** Records a level's frozen solve result — see `DozorEngine.onLevelSolved`.
 * Callers must call `finalizePending` first if the previous pending window
 * belongs to a different level. */
export function recordLevelSolved(
  state: AchievementProgressState,
  levelIndex: number,
  result: LevelAttemptResult,
): AchievementProgressState {
  const noHint = result.hintUsedCount === 0;
  const noHintLevels = noHint ? new Set(state.noHintLevels).add(levelIndex) : state.noHintLevels;
  const cleanStreak = advanceStreak(state.cleanStreak, levelIndex, noHint);

  if (!noHint) {
    // A hint taken this attempt disqualifies it for the perfect streak
    // forever, regardless of any later bonus star — no pending window to
    // open.
    const perfectStreak = advanceStreak(state.perfectStreak, levelIndex, false);
    return { ...state, noHintLevels, cleanStreak, perfectStreak };
  }
  if (result.stars === 3) {
    const perfectStreak = advanceStreak(state.perfectStreak, levelIndex, true);
    return { ...state, noHintLevels, cleanStreak, perfectStreak };
  }
  // No hint, but not yet 3 stars: leave the perfect streak exactly as it is
  // and open a pending window — a bonus star may still rescue this exact
  // attempt (see docs/ACHIEVEMENTS_SPEC.md's rule on "звезда за рекламу")
  // before the player leaves the results screen.
  const wasNext = state.perfectStreak.lastLevel != null && levelIndex === state.perfectStreak.lastLevel + 1;
  return {
    ...state,
    noHintLevels,
    cleanStreak,
    pendingPerfectLevel: levelIndex,
    pendingPerfectWasNext: wasNext,
  };
}

/** Records a "звезда за рекламу" grant — see `DozorEngine.onBonusStarApplied`.
 * A no-op unless `levelIndex` is the currently pending window opened by
 * `recordLevelSolved`. */
export function recordBonusStarApplied(
  state: AchievementProgressState,
  levelIndex: number,
  starsAfter: number,
): AchievementProgressState {
  if (state.pendingPerfectLevel !== levelIndex) return state;
  if (starsAfter !== 3) return state;
  const perfectStreak = advanceStreak(state.perfectStreak, levelIndex, true);
  return { ...state, perfectStreak, pendingPerfectLevel: null, pendingPerfectWasNext: false };
}

/** Both series break immediately and unconditionally — "Сбросить" and
 * "Пройти ещё раз" both route through the same reset, and neither cares
 * which level it happens on (unlike a hint, which only breaks the series it
 * was attempted on) — see docs/ACHIEVEMENTS_SPEC.md. */
export function recordReset(state: AchievementProgressState): AchievementProgressState {
  return {
    ...state,
    cleanStreak: initialStreak,
    perfectStreak: initialStreak,
    pendingPerfectLevel: null,
    pendingPerfectWasNext: false,
  };
}
