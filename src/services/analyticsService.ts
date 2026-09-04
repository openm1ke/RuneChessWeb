import type { LevelAttemptResult } from '../game/starRating';

const COUNTER_ID = 112107479;

export type LevelEntrySource = 'menu_play' | 'level_select' | 'next_level' | 'skip_level';

/** Which of the achievement-progress callbacks led to the unlock — see
 * `recordNewAchievements` in `App.tsx`. */
export type AchievementUnlockTrigger = 'level_solved' | 'hint_used' | 'bonus_star' | 'tutorial_completed';

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

    // Metrica can calculate averages for numeric visit parameters. The level
    // identifier stays a string in the path so it is not included in the
    // average. The only numeric value below it is the solve time in seconds.
    this.visitParams({
      gameplay: {
        completion_time_by_level: { [`level_${levelNumber}`]: result.elapsedSeconds },
      },
    });
  }

  hintUsed(levelIndex: number, hintUsedCount: number, viaAd = false): void {
    this.goal('hint_used', {
      level: levelIndex + 1,
      hint_number: hintUsedCount,
      via_ad: viaAd,
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

  mainCampaignCompleted(): void {
    this.goal('main_campaign_completed', {});
  }

  campaignCompleted(): void {
    this.goal('campaign_completed', {});
  }

  // --- Ad events — mirrors the mobile app's AnalyticsService one-to-one so
  // the same funnel definitions (ad_requested → ad_shown → ad_rewarded →
  // hint_used/bonus_star_granted) apply to both. `placement` is always
  // 'extra_hint' or 'bonus_star'.

  adRequested(placement: string): void {
    this.goal('ad_requested', { placement });
  }

  adLoaded(placement: string): void {
    this.goal('ad_loaded', { placement });
  }

  adLoadFailed(placement: string, reason?: string): void {
    this.goal('ad_load_failed', reason ? { placement, reason } : { placement });
  }

  adShown(placement: string): void {
    this.goal('ad_shown', { placement });
  }

  adShowFailed(placement: string, reason?: string): void {
    this.goal('ad_show_failed', reason ? { placement, reason } : { placement });
  }

  adRewarded(placement: string): void {
    this.goal('ad_rewarded', { placement });
  }

  adClosedWithoutReward(placement: string): void {
    this.goal('ad_closed_without_reward', { placement });
  }

  adUnavailable(placement: string): void {
    this.goal('ad_unavailable', { placement });
  }

  bonusStarGranted(levelIndex: number, starsBefore: number, starsAfter: number): void {
    this.goal('bonus_star_granted', {
      level: levelIndex + 1,
      stars_before: starsBefore,
      stars_after: starsAfter,
    });
  }

  // --- Achievements — the cabinet, its trophies, and the moment one is
  // actually earned. `achievementId` is one of the 11 ids from
  // `AchievementCatalog` (e.g. 'training_pawn', 'coin_zero_first_hint').

  achievementUnlocked(achievementId: string, category: 'orb' | 'coin', trigger: AchievementUnlockTrigger): void {
    this.goal('achievement_unlocked', {
      achievement_id: achievementId,
      category,
      trigger,
    });
  }

  achievementsOpened(): void {
    this.goal('achievements_opened', {});
  }

  dailyChallengeOpened(date: string): void {
    this.goal('daily_challenge_opened', { date });
  }

  dailyChallengeStarted(date: string): void {
    this.goal('daily_challenge_started', { date });
  }

  dailyChallengeCompleted(date: string, stars: number, hintsUsed: number): void {
    this.goal('daily_challenge_completed', { date, stars, hints_used: hintsUsed });
  }

  achievementViewed(achievementId: string, unlocked: boolean): void {
    this.goal('achievement_viewed', {
      achievement_id: achievementId,
      unlocked,
    });
  }

  /** A visit parameter (not a goal) so unlocked-achievement count can be
   * used as a segmentation dimension — mirrors the `gameplay.
   * completion_time_by_level` pattern in `levelCompleted` above. */
  achievementProgressSnapshot(unlockedTotal: number): void {
    this.visitParams({
      achievements: { unlocked_total: unlockedTotal },
    });
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
