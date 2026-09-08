import { campaignLevels } from '../data/campaignLevels';
import { FIRST_SCORED_LEVEL_INDEX } from '../game/dozorEngine';
import type { AchievementProgressState, StreakState } from '../game/achievementProgress';
import type { DailyChallengeResult } from '../game/dailyChallengeLevels';
import {
  defaultHintWalletConfig,
  initialHintWallet,
  type HintWallet,
} from '../game/hintWallet';

export interface ProgressSnapshot {
  unlockedLevels: Set<number>;
  highestLevel: number;
  seenOnboardingLevels: Set<number>;
  /** Levels the player was handed rather than solved — see `save`. */
  skippedLevels: Set<number>;
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  musicEnabled: boolean;
  musicVolume: number;
  soundEffectsEnabled: boolean;
  analyticsConsent: boolean | null;
  achievementUnlockedAt: Map<string, string>;
  achievementProgress: AchievementProgressState;
  dailyChallengeHistory: Map<string, DailyChallengeResult>;
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
}

const KEYS = {
  unlockedLevels: 'dozor.unlocked_level_indexes',
  seenOnboardingLevels: 'dozor.seen_onboarding_level_indexes',
  // Levels advanced past without solving them (the rewarded-ad skip, or the
  // dev control). Stored so "Пройдено уровней" can leave them out — the
  // unlocked-level frontier alone cannot tell a solve from a skip.
  skippedLevels: 'dozor.skipped_level_indexes_v1',
  tutorialComplete: 'dozor.tutorial_campaign_complete',
  musicEnabled: 'dozor.music_enabled',
  musicVolume: 'dozor.music_volume',
  soundEffectsEnabled: 'dozor.sound_effects_enabled',
  levelStars: 'dozor.level_stars_v1',
  analyticsConsent: 'runechess.analytics_consent_v1',
  achievementUnlockedAt: 'dozor.achievement_unlocked_at_v1',
  achievementHintedLevels: 'dozor.achievement_hinted_levels_v1',
  achievementNoHintLevels: 'dozor.achievement_no_hint_levels_v1',
  achievementCleanStreak: 'dozor.achievement_clean_streak_v1',
  achievementPerfectStreak: 'dozor.achievement_perfect_streak_v1',
  dailyChallengeHistory: 'dozor.daily_challenge_history_v1',
  dailyReminderEnabled: 'dozor.daily_reminder_enabled',
  dailyReminderHour: 'dozor.daily_reminder_hour',
  dailyReminderLastShownDate: 'dozor.daily_reminder_last_shown_date',
  dailyReminderLastMessage: 'dozor.daily_reminder_last_message',
  announcedFreezeDate: 'dozor.daily_freeze_announced_v1',
  // The free-hint wallet: how many are in stock, and when the current refill
  // window started — see `hintWallet.ts`.
  hintWallet: 'dozor.hint_wallet_v1',
  // Which cosmetic set the player is wearing (`CosmeticSkin.id`). A
  // preference, not progress: a full reset leaves it alone.
  cosmeticSkin: 'dozor.cosmetic_skin_v1',
  // The star economy: which sets have been bought, everything ever paid
  // for them, and the stars rewarded ads added to daily challenges. What
  // was *earned* is never stored — it is computed from progress itself.
  unlockedSkins: 'dozor.unlocked_skins_v1',
  starsSpent: 'dozor.stars_spent_v1',
  dailyBonusStars: 'dozor.daily_bonus_stars_v1',
} as const;

const DEFAULT_DAILY_REMINDER_HOUR = 11;

/** A stored non-negative whole number, or zero for anything else. */
function readCount(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return 0;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    logError(`read ${key}`, error);
    return 0;
  }
}

function readStreak(key: string): StreakState {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return { lastLevel: null, length: 0 };
    const [lastLevelRaw, lengthRaw] = raw.split(',');
    const lastLevel = Number.parseInt(lastLevelRaw, 10);
    const length = Number.parseInt(lengthRaw, 10);
    if (!Number.isInteger(lastLevel) || !Number.isInteger(length) || length <= 0) {
      return { lastLevel: null, length: 0 };
    }
    return { lastLevel, length };
  } catch (error) {
    logError(`read ${key}`, error);
    return { lastLevel: null, length: 0 };
  }
}

function writeStreak(key: string, streak: StreakState): void {
  try {
    if (streak.lastLevel == null || streak.length <= 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, `${streak.lastLevel},${streak.length}`);
  } catch (error) {
    logError(`write ${key}`, error);
  }
}

function readIndexSet(key: string): Set<number> {
  const raw = readJson<string[]>(key) ?? [];
  return new Set(
    raw.map((v) => Number.parseInt(v, 10)).filter((index) => Number.isInteger(index) && index >= 0),
  );
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    logError(`read ${key}`, error);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logError(`write ${key}`, error);
  }
}

function removeValue(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logError(`remove ${key}`, error);
  }
}

function logError(action: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`Dozor: progress ${action} failed:`, error);
  }
}

/**
 * Reads and writes every piece of local player state (unlocked levels,
 * onboarding progress, tutorial completion, best stars per level, and the
 * music settings) through `localStorage`. This is the only place in the app
 * that talks to `localStorage` directly — a port of `ProgressRepository`
 * from the Flutter app (`SharedPreferences` → `localStorage`).
 */
export class ProgressRepository {
  load(): ProgressSnapshot {
    const storedUnlocked = readJson<string[]>(KEYS.unlockedLevels);
    const seenOnboardingRaw = readJson<string[]>(KEYS.seenOnboardingLevels) ?? [];
    const seenOnboardingLevels = new Set<number>(
      seenOnboardingRaw
        .map((v) => Number.parseInt(v, 10))
        .filter((index) => Number.isInteger(index) && index >= 0 && index < FIRST_SCORED_LEVEL_INDEX),
    );
    const skippedRaw = readJson<string[]>(KEYS.skippedLevels) ?? [];
    const skippedLevels = new Set<number>(
      skippedRaw
        .map((v) => Number.parseInt(v, 10))
        .filter((index) => Number.isInteger(index) && index >= 0 && index < campaignLevels.length),
    );
    const tutorialComplete = readJson<boolean>(KEYS.tutorialComplete) ?? false;
    const musicEnabled = readJson<boolean>(KEYS.musicEnabled) ?? true;
    const storedMusicVolume = readJson<number>(KEYS.musicVolume) ?? 0.6;
    const musicVolume = Math.min(1, Math.max(0, storedMusicVolume));
    const soundEffectsEnabled = readJson<boolean>(KEYS.soundEffectsEnabled) ?? true;
    const storedAnalyticsConsent = readJson<unknown>(KEYS.analyticsConsent);
    const analyticsConsent = typeof storedAnalyticsConsent === 'boolean' ? storedAnalyticsConsent : null;

    const levelStars = new Map<number, number>();
    const rawStars = readJson<Record<string, unknown>>(KEYS.levelStars);
    if (rawStars != null) {
      for (const [key, value] of Object.entries(rawStars)) {
        const index = Number.parseInt(key, 10);
        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < campaignLevels.length &&
          typeof value === 'number' &&
          value >= 1 &&
          value <= 3
        ) {
          levelStars.set(index, value);
        }
      }
    }

    const unlocked = new Set<number>(
      storedUnlocked == null
        ? [0]
        : storedUnlocked
            .map((v) => Number.parseInt(v, 10))
            .filter((index) => Number.isInteger(index) && index >= 0 && index < campaignLevels.length),
    );
    unlocked.add(0);
    const highest = Math.max(...unlocked);

    const achievementUnlockedAt = new Map<string, string>();
    const rawUnlockedAt = readJson<Record<string, unknown>>(KEYS.achievementUnlockedAt);
    if (rawUnlockedAt != null) {
      for (const [id, value] of Object.entries(rawUnlockedAt)) {
        if (typeof value === 'string') achievementUnlockedAt.set(id, value);
      }
    }
    const achievementProgress: AchievementProgressState = {
      hintedLevels: readIndexSet(KEYS.achievementHintedLevels),
      noHintLevels: readIndexSet(KEYS.achievementNoHintLevels),
      cleanStreak: readStreak(KEYS.achievementCleanStreak),
      perfectStreak: readStreak(KEYS.achievementPerfectStreak),
      pendingPerfectLevel: null,
      pendingPerfectWasNext: false,
    };

    const dailyChallengeHistory = new Map<string, DailyChallengeResult>();
    const rawDailyHistory = readJson<Record<string, unknown>>(KEYS.dailyChallengeHistory);
    if (rawDailyHistory != null) {
      for (const [key, value] of Object.entries(rawDailyHistory)) {
        if (
          value != null &&
          typeof value === 'object' &&
          typeof (value as { stars?: unknown }).stars === 'number' &&
          typeof (value as { hintsUsed?: unknown }).hintsUsed === 'number'
        ) {
          const v = value as { stars: number; hintsUsed: number };
          dailyChallengeHistory.set(key, { stars: v.stars, hintsUsed: v.hintsUsed });
        }
      }
    }
    const dailyReminderEnabled = readJson<boolean>(KEYS.dailyReminderEnabled) ?? false;
    const storedReminderHour = readJson<number>(KEYS.dailyReminderHour);
    const dailyReminderHour =
      storedReminderHour != null && Number.isInteger(storedReminderHour) && storedReminderHour >= 0 && storedReminderHour <= 23
        ? storedReminderHour
        : DEFAULT_DAILY_REMINDER_HOUR;

    return {
      unlockedLevels: unlocked,
      highestLevel: highest,
      seenOnboardingLevels,
      skippedLevels,
      tutorialComplete,
      levelStars,
      musicEnabled,
      musicVolume,
      soundEffectsEnabled,
      analyticsConsent,
      achievementUnlockedAt,
      achievementProgress,
      dailyChallengeHistory,
      dailyReminderEnabled,
      dailyReminderHour,
    };
  }

  save(args: {
    unlockedLevels: Set<number>;
    seenOnboardingLevels: Set<number>;
    skippedLevels?: Set<number>;
    tutorialComplete: boolean;
    levelStars: Map<number, number>;
    achievementUnlockedAt?: Map<string, string>;
    achievementProgress?: AchievementProgressState;
  }): void {
    writeJson(
      KEYS.unlockedLevels,
      [...args.unlockedLevels].sort((a, b) => a - b).map(String),
    );
    writeJson(
      KEYS.seenOnboardingLevels,
      [...args.seenOnboardingLevels].sort((a, b) => a - b).map(String),
    );
    if (args.skippedLevels != null) {
      writeJson(
        KEYS.skippedLevels,
        [...args.skippedLevels].sort((a, b) => a - b).map(String),
      );
    }
    writeJson(KEYS.tutorialComplete, args.tutorialComplete);
    const starsPayload: Record<string, number> = {};
    for (const [index, stars] of args.levelStars) starsPayload[String(index)] = stars;
    writeJson(KEYS.levelStars, starsPayload);

    if (args.achievementUnlockedAt != null) {
      const unlockedAtPayload: Record<string, string> = {};
      for (const [id, date] of args.achievementUnlockedAt) unlockedAtPayload[id] = date;
      writeJson(KEYS.achievementUnlockedAt, unlockedAtPayload);
    }
    if (args.achievementProgress != null) {
      writeJson(KEYS.achievementHintedLevels, [...args.achievementProgress.hintedLevels].sort((a, b) => a - b).map(String));
      writeJson(KEYS.achievementNoHintLevels, [...args.achievementProgress.noHintLevels].sort((a, b) => a - b).map(String));
      writeStreak(KEYS.achievementCleanStreak, args.achievementProgress.cleanStreak);
      writeStreak(KEYS.achievementPerfectStreak, args.achievementProgress.perfectStreak);
    }
  }

  /** The chosen cosmetic set, or null for "whatever the game defaults to". */
  loadCosmeticSkinId(): string | null {
    try {
      return window.localStorage.getItem(KEYS.cosmeticSkin);
    } catch (error) {
      logError('load cosmetic skin', error);
      return null;
    }
  }

  saveCosmeticSkinId(id: string): void {
    try {
      window.localStorage.setItem(KEYS.cosmeticSkin, id);
    } catch (error) {
      logError('save cosmetic skin', error);
    }
  }

  /** The sets the player has bought — the free ones are not stored. */
  loadUnlockedSkinIds(): Set<string> {
    try {
      const raw = window.localStorage.getItem(KEYS.unlockedSkins);
      if (raw == null) return new Set();
      const decoded: unknown = JSON.parse(raw);
      if (!Array.isArray(decoded)) return new Set();
      return new Set(decoded.filter((id): id is string => typeof id === 'string'));
    } catch (error) {
      logError('load unlocked skins', error);
      return new Set();
    }
  }

  saveUnlockedSkinIds(ids: Set<string>): void {
    writeJson(KEYS.unlockedSkins, [...ids].sort());
  }

  /** Everything ever paid out for cosmetic sets. */
  loadStarsSpent(): number {
    return readCount(KEYS.starsSpent);
  }

  saveStarsSpent(spent: number): void {
    writeJson(KEYS.starsSpent, spent);
  }

  /** Stars rewarded ads added to daily challenges — kept out of the day's
   * own result so the calendar shows what the puzzle was solved for. */
  loadDailyBonusStars(): number {
    return readCount(KEYS.dailyBonusStars);
  }

  saveDailyBonusStars(stars: number): void {
    writeJson(KEYS.dailyBonusStars, stars);
  }

  saveMusicSettings(args: { musicEnabled: boolean; musicVolume: number }): void {
    writeJson(KEYS.musicEnabled, args.musicEnabled);
    writeJson(KEYS.musicVolume, args.musicVolume);
  }

  saveSoundEffectsEnabled(enabled: boolean): void {
    writeJson(KEYS.soundEffectsEnabled, enabled);
  }

  /** Clears level completion and tutorial state while keeping music and privacy choices. */
  resetProgress(): void {
    removeValue(KEYS.unlockedLevels);
    removeValue(KEYS.seenOnboardingLevels);
    removeValue(KEYS.skippedLevels);
    removeValue(KEYS.tutorialComplete);
    removeValue(KEYS.levelStars);
    removeValue(KEYS.achievementUnlockedAt);
    removeValue(KEYS.achievementHintedLevels);
    removeValue(KEYS.achievementNoHintLevels);
    removeValue(KEYS.achievementCleanStreak);
    removeValue(KEYS.achievementPerfectStreak);
    removeValue(KEYS.dailyChallengeHistory);
  }

  saveAnalyticsConsent(consent: boolean): void {
    writeJson(KEYS.analyticsConsent, consent);
  }

  /** Saves `date`'s daily-challenge result, keyed by its local calendar day
   * — never by any level index, since the daily challenge is not part of
   * the campaign array. The best of any two attempts for the same day wins,
   * mirroring `mergeBestStars`'s never-downgrade rule for campaign levels. */
  saveDailyChallengeResult(
    history: Map<string, DailyChallengeResult>,
    key: string,
    result: DailyChallengeResult,
  ): Map<string, DailyChallengeResult> {
    const existing = history.get(key);
    const next = existing == null || existing.stars < result.stars ? new Map(history).set(key, result) : history;
    if (next !== history) {
      const payload: Record<string, DailyChallengeResult> = {};
      for (const [k, v] of next) payload[k] = v;
      writeJson(KEYS.dailyChallengeHistory, payload);
    }
    return next;
  }

  saveDailyReminderSettings(args: { enabled: boolean; hour: number }): void {
    writeJson(KEYS.dailyReminderEnabled, args.enabled);
    writeJson(KEYS.dailyReminderHour, args.hour);
  }

  loadDailyReminderShownState(): { lastShownDate: string | null; lastMessage: string | null } {
    return {
      lastShownDate: readJson<string>(KEYS.dailyReminderLastShownDate),
      lastMessage: readJson<string>(KEYS.dailyReminderLastMessage),
    };
  }

  saveDailyReminderShownState(shownDate: string, message: string): void {
    writeJson(KEYS.dailyReminderLastShownDate, shownDate);
    writeJson(KEYS.dailyReminderLastMessage, message);
  }

  /** The most recent day whose freeze consumption the player has already
   * been told about, `dailyChallengeKey`-formatted, or null if none.
   *
   * The freeze is spent silently by `computeDailyChallengeStats` — nothing
   * asks the player, by design. Without a record of what has been announced,
   * the notice would either never appear or reappear on every visit. */
  /** The player's free-hint wallet, or a full one for a player who has never
   * had it saved. */
  loadHintWallet(now: number): HintWallet {
    const stored = readJson<HintWallet>(KEYS.hintWallet);
    if (stored == null || typeof stored.stock !== 'number' || typeof stored.lastRefillAt !== 'number') {
      return initialHintWallet(now);
    }
    return {
      stock: Math.max(0, Math.min(defaultHintWalletConfig.max, stored.stock)),
      lastRefillAt: stored.lastRefillAt,
    };
  }

  saveHintWallet(wallet: HintWallet): void {
    writeJson(KEYS.hintWallet, wallet);
  }

  loadAnnouncedFreezeDate(): string | null {
    return readJson<string>(KEYS.announcedFreezeDate);
  }

  saveAnnouncedFreezeDate(key: string): void {
    writeJson(KEYS.announcedFreezeDate, key);
  }
}
