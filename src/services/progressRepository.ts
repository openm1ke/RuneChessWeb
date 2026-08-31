import { campaignLevels } from '../data/campaignLevels';
import { FIRST_SCORED_LEVEL_INDEX } from '../game/dozorEngine';

export interface ProgressSnapshot {
  unlockedLevels: Set<number>;
  highestLevel: number;
  seenOnboardingLevels: Set<number>;
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  musicEnabled: boolean;
  musicVolume: number;
  analyticsConsent: boolean | null;
}

const KEYS = {
  unlockedLevels: 'dozor.unlocked_level_indexes',
  seenOnboardingLevels: 'dozor.seen_onboarding_level_indexes',
  tutorialComplete: 'dozor.tutorial_campaign_complete',
  musicEnabled: 'dozor.music_enabled',
  musicVolume: 'dozor.music_volume',
  levelStars: 'dozor.level_stars_v1',
  analyticsConsent: 'runechess.analytics_consent_v1',
} as const;

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
    const tutorialComplete = readJson<boolean>(KEYS.tutorialComplete) ?? false;
    const musicEnabled = readJson<boolean>(KEYS.musicEnabled) ?? true;
    const storedMusicVolume = readJson<number>(KEYS.musicVolume) ?? 0.6;
    const musicVolume = Math.min(1, Math.max(0, storedMusicVolume));
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

    return {
      unlockedLevels: unlocked,
      highestLevel: highest,
      seenOnboardingLevels,
      tutorialComplete,
      levelStars,
      musicEnabled,
      musicVolume,
      analyticsConsent,
    };
  }

  save(args: {
    unlockedLevels: Set<number>;
    seenOnboardingLevels: Set<number>;
    tutorialComplete: boolean;
    levelStars: Map<number, number>;
  }): void {
    writeJson(
      KEYS.unlockedLevels,
      [...args.unlockedLevels].sort((a, b) => a - b).map(String),
    );
    writeJson(
      KEYS.seenOnboardingLevels,
      [...args.seenOnboardingLevels].sort((a, b) => a - b).map(String),
    );
    writeJson(KEYS.tutorialComplete, args.tutorialComplete);
    const starsPayload: Record<string, number> = {};
    for (const [index, stars] of args.levelStars) starsPayload[String(index)] = stars;
    writeJson(KEYS.levelStars, starsPayload);
  }

  saveMusicSettings(args: { musicEnabled: boolean; musicVolume: number }): void {
    writeJson(KEYS.musicEnabled, args.musicEnabled);
    writeJson(KEYS.musicVolume, args.musicVolume);
  }

  /** Clears level completion and tutorial state while keeping music and privacy choices. */
  resetProgress(): void {
    removeValue(KEYS.unlockedLevels);
    removeValue(KEYS.seenOnboardingLevels);
    removeValue(KEYS.tutorialComplete);
    removeValue(KEYS.levelStars);
  }

  saveAnalyticsConsent(consent: boolean): void {
    writeJson(KEYS.analyticsConsent, consent);
  }
}
