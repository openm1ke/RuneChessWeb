import type { LevelAttemptResult } from '../game/starRating';

const COUNTER_ID = 112107479;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

/**
 * Sends anonymous game events to Yandex Metrica. The browser-side counter is
 * deliberately the only identifier involved: no player name, contact data,
 * board position, or other personal data is collected.
 */
export class AnalyticsService {
  levelStarted(levelIndex: number, isTutorial: boolean): void {
    this.goal('level_started', {
      level: levelIndex + 1,
      is_tutorial: isTutorial,
    });
  }

  levelCompleted(levelIndex: number, result: LevelAttemptResult): void {
    this.goal('level_completed', {
      level: levelIndex + 1,
      is_tutorial: result.stars == null,
      stars: result.stars ?? 0,
      elapsed_seconds: result.elapsedSeconds,
      moves: result.moveCount,
      hints_used: result.hintUsedCount,
    });
  }

  hintUsed(levelIndex: number, hintUsedCount: number): void {
    this.goal('hint_used', {
      level: levelIndex + 1,
      hint_number: hintUsedCount,
    });
  }

  levelReset(levelIndex: number, metrics: { elapsedSeconds: number; moveCount: number; hintUsedCount: number }): void {
    this.goal('level_reset', {
      level: levelIndex + 1,
      elapsed_seconds: metrics.elapsedSeconds,
      moves: metrics.moveCount,
      hints_used: metrics.hintUsedCount,
    });
  }

  private goal(name: string, params: Record<string, number | boolean>): void {
    // Do not pollute the production analytics counter while running the local
    // Vite development server. Failure of the counter or an ad blocker must
    // never affect play.
    if (import.meta.env.DEV || typeof window.ym !== 'function') return;
    window.ym(COUNTER_ID, 'reachGoal', name, params);
  }
}
