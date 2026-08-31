/**
 * Frozen metrics for a single level-solving attempt, captured at the exact
 * moment every beacon first reaches its exact target count. `stars` is null
 * for the five tutorial levels, which are never scored.
 */
export interface LevelAttemptResult {
  stars: number | null;
  elapsedSeconds: number;
  moveCount: number;
  hintUsedCount: number;
}

export interface ComputeStarsArgs {
  requiredMoves: number;
  moveCount: number;
  hintUsedCount: number;
  elapsedSeconds: number;
}

/**
 * Star rules for a completed level:
 * - Using the hint button even once caps the result at 1 star.
 * - 3 stars: solved with (near-)minimal moves, comfortably inside the
 *   level's time budget, no hints.
 * - 2 stars: solved without hints, but with noticeably more moves or time.
 * - 1 star is the floor — a completed level is never scored 0.
 */
export function computeStars({
  requiredMoves,
  moveCount,
  hintUsedCount,
  elapsedSeconds,
}: ComputeStarsArgs): number {
  if (hintUsedCount > 0) return 1;

  const timeLimit3 = 20 + requiredMoves * 12;
  const timeLimit2 = timeLimit3 * 2;

  if (moveCount <= requiredMoves + 1 && elapsedSeconds <= timeLimit3) {
    return 3;
  }
  if (moveCount <= requiredMoves * 2 && elapsedSeconds <= timeLimit2) {
    return 2;
  }
  return 1;
}

/**
 * Merges a freshly-earned star count into a previously saved best result for
 * a level, keeping whichever is higher. A weaker replay can never erase a
 * stronger earlier result.
 */
export function mergeBestStars(previousBest: number | null | undefined, attemptStars: number): number {
  return previousBest == null || attemptStars > previousBest ? attemptStars : previousBest;
}
