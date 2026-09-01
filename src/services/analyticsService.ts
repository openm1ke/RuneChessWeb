import type { LevelAttemptResult } from '../game/starRating';

const COUNTER_ID = 112107479;

export type LevelEntrySource = 'menu_play' | 'level_select' | 'next_level' | 'skip_level';

type AnalyticsParameter = string | number | boolean | { [key: string]: AnalyticsParameter };

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
  private enabled = false;

  enable(): void {
    if (this.enabled || import.meta.env.DEV || typeof window === 'undefined') return;
    this.enabled = true;

    if (typeof window.ym !== 'function') {
      const queuedYm = ((...args: unknown[]) => {
        queuedYm.a = queuedYm.a ?? [];
        queuedYm.a.push(args);
      }) as ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
      queuedYm.l = Date.now();
      window.ym = queuedYm;

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;
      document.head.appendChild(script);
    }

    window.ym(COUNTER_ID, 'init', {
      ssr: true,
      clickmap: true,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }

  levelStarted(levelIndex: number, isTutorial: boolean, entrySource: LevelEntrySource): void {
    this.goal('level_started', {
      level: levelIndex + 1,
      is_tutorial: isTutorial,
      entry_source: entrySource,
    });
  }

  levelSelected(levelIndex: number, isTutorial: boolean): void {
    this.goal('level_selected', {
      level: levelIndex + 1,
      is_tutorial: isTutorial,
    });
  }

  levelCompleted(levelIndex: number, result: LevelAttemptResult, entrySource: LevelEntrySource): void {
    const levelNumber = levelIndex + 1;
    this.goal('level_completed', {
      level: levelNumber,
      is_tutorial: result.stars == null,
      stars: result.stars ?? 0,
      elapsed_seconds: result.elapsedSeconds,
      moves: result.moveCount,
      hints_used: result.hintUsedCount,
      entry_source: entrySource,
    });

    // Metrica can calculate averages for numeric visit parameters. Keeping the
    // level number in the path makes the report expandable as
    // gameplay → completion_time_by_level → level number, with the numeric
    // value available as an average for that level.
    this.visitParams({
      gameplay: {
        completion_time_by_level: { [String(levelNumber)]: result.elapsedSeconds },
      },
    });
  }

  hintUsed(levelIndex: number, hintUsedCount: number): void {
    this.goal('hint_used', {
      level: levelIndex + 1,
      hint_number: hintUsedCount,
    });
  }

  levelSelectOpened(): void {
    this.goal('levels_opened', {});
  }

  settingsOpened(): void {
    this.goal('settings_opened', {});
  }

  progressResetConfirmed(): void {
    this.goal('progress_reset_confirmed', {});
  }

  musicEnabled(): void {
    this.goal('music_enabled', {});
  }

  musicDisabled(): void {
    this.goal('music_disabled', {});
  }

  levelReset(levelIndex: number, metrics: { elapsedSeconds: number; moveCount: number; hintUsedCount: number }): void {
    this.goal('level_reset', {
      level: levelIndex + 1,
      elapsed_seconds: metrics.elapsedSeconds,
      moves: metrics.moveCount,
      hints_used: metrics.hintUsedCount,
    });
  }

  tutorialCompleted(): void {
    this.goal('tutorial_completed', {});
  }

  campaignCompleted(): void {
    this.goal('campaign_completed', {});
  }

  private goal(name: string, params: Record<string, AnalyticsParameter>): void {
    // Do not pollute the production analytics counter while running the local
    // Vite development server. Failure of the counter or an ad blocker must
    // never affect play.
    if (!this.enabled || typeof window.ym !== 'function') return;
    window.ym(COUNTER_ID, 'reachGoal', name, params);
  }

  private visitParams(params: Record<string, AnalyticsParameter>): void {
    if (!this.enabled || typeof window.ym !== 'function') return;
    window.ym(COUNTER_ID, 'params', params);
  }
}
