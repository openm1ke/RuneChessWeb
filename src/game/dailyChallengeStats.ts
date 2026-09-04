import { dailyChallengeKey, type DailyChallengeResult } from './dailyChallengeLevels';

/** Derived streak/freeze state for the daily challenge, computed purely from
 * the saved history — never stored on its own. Recomputing from scratch
 * every time avoids a second source of truth that could drift from the
 * history it's derived from. */
export interface DailyChallengeStats {
  /** Consecutive *solved* days counted through today, unbroken by any single
   * day the freeze covered (see `frozenDates`) — a frozen day doesn't add to
   * the count, but doesn't reset it either. */
  currentStreak: number;
  /** Whether a freeze is available right now to forgive the next missed day.
   * Starts true for a player with no history yet. */
  freezeAvailable: boolean;
  /** `dailyChallengeKey`-formatted dates where a missed day was forgiven by
   * the freeze — the calendar renders these with a snowflake instead of as a
   * plain gap. */
  frozenDates: Set<string>;
}

function parseDailyChallengeKey(key: string): Date {
  const [year, month, day] = key.split('-').map((v) => Number.parseInt(v, 10));
  return new Date(year, month - 1, day);
}

/** Walks every calendar day from the first ever solved day through `today`
 * (inclusive only if today is itself solved — an unplayed *today* is never
 * treated as a miss), applying the freeze economy: starts with one freeze,
 * spends it on the first single missed day (which does not reset the
 * streak), refills to at most one every 7-day streak, and a second
 * consecutive miss (freeze already spent) resets the streak to 0. */
export function computeDailyChallengeStats({
  history,
  today,
}: {
  history: Map<string, DailyChallengeResult>;
  today: Date;
}): DailyChallengeStats {
  if (history.size === 0) {
    return { currentStreak: 0, freezeAvailable: true, frozenDates: new Set() };
  }
  const solvedDays = [...history.keys()].map(parseDailyChallengeKey).sort((a, b) => a.getTime() - b.getTime());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let freeze = 1;
  let streak = 0;
  const frozen = new Set<string>();

  for (let day = solvedDays[0]; day.getTime() <= todayDay.getTime(); day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const key = dailyChallengeKey(day);
    const solved = history.has(key);
    if (!solved && day.getTime() === todayDay.getTime()) break; // today just hasn't happened yet
    if (solved) {
      streak++;
      if (streak % 7 === 0 && freeze === 0) freeze = 1;
    } else if (freeze > 0) {
      freeze--;
      frozen.add(key);
    } else {
      streak = 0;
    }
  }

  return { currentStreak: streak, freezeAvailable: freeze > 0, frozenDates: frozen };
}
