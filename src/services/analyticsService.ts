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

  /** Stops reporting immediately. The Metrica tag stays loaded — there is no
   * API to unload it — but it only ever receives what this service sends, and
   * after this it receives nothing. The player's stored choice keeps it from
   * being initialised at all on the next load.
   *
   * Withdrawing consent has to be as easy as giving it, and until this
   * existed there was no way back: `enable` was one-way, so the counter kept
   * firing goals for the rest of the session no matter what the player chose
   * afterwards. */
  disable(): void {
    this.enabled = false;
  }

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

  levelCompleted(
    levelIndex: number,
    isTutorial: boolean,
    result: LevelAttemptResult,
    entrySource: LevelEntrySource,
  ): void {
    const levelNumber = levelIndex + 1;
    this.goal('level_completed', {
      level: levelNumber,
      is_tutorial: isTutorial,
      // Omitted rather than sent as 0 for an unscored tutorial level, which
      // is what the mobile app does: a zero would drag every average over
      // this goal down, and "no score" is not a score of nothing.
      ...(result.stars == null ? {} : { stars: result.stars }),
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

  /**
   * Reports the rules being opened, then runs `onDone`.
   *
   * Rules live on a separate static page here, so the click that reports this
   * is the same click that navigates away — a plain `goal()` would race the
   * unload. Metrica's callback tells us the hit is away; the timer is the
   * fallback for a blocked or slow counter, and for the case where reporting
   * is off entirely, so a player never ends up stuck on the menu because
   * analytics did not answer.
   */
  rulesOpened(onDone?: () => void): void {
    if (!this.enabled || typeof window.ym !== 'function') {
      onDone?.();
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone?.();
    };
    window.ym(COUNTER_ID, 'reachGoal', 'rules_opened', {}, finish);
    window.setTimeout(finish, 400);
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

  /** Left a level without solving it. `started` minus `completed` gives the
   * count, but not where people give up — how far in, after how many moves,
   * with or without a hint. For a puzzle game that is where the difficulty
   * spikes show themselves. */
  levelAbandoned(
    levelIndex: number,
    isTutorial: boolean,
    metrics: { elapsedSeconds: number; moveCount: number; hintUsedCount: number },
  ): void {
    this.goal('level_abandoned', {
      level: levelIndex + 1,
      is_tutorial: isTutorial,
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

  /** The player was *shown* the offer, before any decision. Without it the
   * rewarded funnel starts at `ad_requested` and there is no way to tell how
   * many people saw the offer and ignored it — which is the whole question
   * when the offer's presentation changes. */
  adOfferShown(placement: string): void {
    this.goal('ad_offer_shown', { placement });
  }

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

  dailyChallengeCompleted(
    date: string,
    stars: number,
    hintsUsed: number,
    streakLength?: number,
  ): void {
    this.goal('daily_challenge_completed', {
      date,
      stars,
      hints_used: hintsUsed,
      ...(streakLength == null ? {} : { streak_length: streakLength }),
    });
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
