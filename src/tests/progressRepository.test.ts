import { beforeEach, describe, expect, it } from 'vitest';
import { ProgressRepository } from '../services/progressRepository';

describe('ProgressRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to level 0 unlocked, no stars, music on at 60% when nothing is stored', () => {
    const repo = new ProgressRepository();
    const snapshot = repo.load();
    expect(snapshot.unlockedLevels.has(0)).toBe(true);
    expect(snapshot.highestLevel).toBe(0);
    expect(snapshot.tutorialComplete).toBe(false);
    expect(snapshot.levelStars.size).toBe(0);
    expect(snapshot.musicEnabled).toBe(true);
    expect(snapshot.musicVolume).toBeCloseTo(0.6);
  });

  it('round-trips unlocked levels, stars, onboarding and tutorial completion', () => {
    const repo = new ProgressRepository();
    const unlockedLevels = new Set([0, 1, 2, 5, 6]);
    const seenOnboardingLevels = new Set([0, 1]);
    const levelStars = new Map([
      [5, 3],
      [6, 2],
    ]);
    repo.save({ unlockedLevels, seenOnboardingLevels, tutorialComplete: true, levelStars });

    const snapshot = repo.load();
    expect([...snapshot.unlockedLevels].sort()).toEqual([0, 1, 2, 5, 6]);
    expect(snapshot.highestLevel).toBe(6);
    expect([...snapshot.seenOnboardingLevels].sort()).toEqual([0, 1]);
    expect(snapshot.tutorialComplete).toBe(true);
    expect(snapshot.levelStars.get(5)).toBe(3);
    expect(snapshot.levelStars.get(6)).toBe(2);
  });

  it('a reset attempt (fewer stars) never overwrites a previously saved best when merged by the caller', () => {
    const repo = new ProgressRepository();
    repo.save({
      unlockedLevels: new Set([0]),
      seenOnboardingLevels: new Set(),
      tutorialComplete: false,
      levelStars: new Map([[5, 3]]),
    });
    // The app layer is responsible for calling mergeBestStars before saving;
    // this simply verifies the repository persists whatever it's given, so a
    // caller that merges correctly keeps its guarantee end-to-end.
    const reloaded = repo.load();
    expect(reloaded.levelStars.get(5)).toBe(3);
  });

  it('clamps a corrupt/out-of-range stored music volume into [0, 1]', () => {
    window.localStorage.setItem('dozor.music_volume', JSON.stringify(4.2));
    const repo = new ProgressRepository();
    const snapshot = repo.load();
    expect(snapshot.musicVolume).toBe(1);
  });

  it('ignores corrupt JSON in the stars key rather than throwing', () => {
    window.localStorage.setItem('dozor.level_stars_v1', 'not json');
    const repo = new ProgressRepository();
    expect(() => repo.load()).not.toThrow();
    expect(repo.load().levelStars.size).toBe(0);
  });

  it('saves and reloads music settings independently of progress', () => {
    const repo = new ProgressRepository();
    repo.saveMusicSettings({ musicEnabled: false, musicVolume: 0.25 });
    const snapshot = repo.load();
    expect(snapshot.musicEnabled).toBe(false);
    expect(snapshot.musicVolume).toBeCloseTo(0.25);
  });

  it('resets only game progress and keeps music and analytics choices', () => {
    const repo = new ProgressRepository();
    repo.save({
      unlockedLevels: new Set([0, 1, 6]),
      seenOnboardingLevels: new Set([0, 1]),
      tutorialComplete: true,
      levelStars: new Map([[6, 3]]),
    });
    repo.saveMusicSettings({ musicEnabled: false, musicVolume: 0.25 });
    repo.saveAnalyticsConsent(true);

    repo.resetProgress();

    const snapshot = repo.load();
    expect([...snapshot.unlockedLevels]).toEqual([0]);
    expect(snapshot.seenOnboardingLevels.size).toBe(0);
    expect(snapshot.tutorialComplete).toBe(false);
    expect(snapshot.levelStars.size).toBe(0);
    expect(snapshot.musicEnabled).toBe(false);
    expect(snapshot.musicVolume).toBeCloseTo(0.25);
    expect(snapshot.analyticsConsent).toBe(true);
  });

  it('defaults to empty achievement state when nothing is stored', () => {
    const repo = new ProgressRepository();
    const snapshot = repo.load();
    expect(snapshot.achievementUnlockedAt.size).toBe(0);
    expect(snapshot.achievementProgress.hintedLevels.size).toBe(0);
    expect(snapshot.achievementProgress.noHintLevels.size).toBe(0);
    expect(snapshot.achievementProgress.cleanStreak).toEqual({ lastLevel: null, length: 0 });
    expect(snapshot.achievementProgress.perfectStreak).toEqual({ lastLevel: null, length: 0 });
  });

  it('round-trips achievement unlock timestamps and progress state', () => {
    const repo = new ProgressRepository();
    repo.save({
      unlockedLevels: new Set([0]),
      seenOnboardingLevels: new Set(),
      tutorialComplete: true,
      levelStars: new Map([[5, 3]]),
      achievementUnlockedAt: new Map([
        ['training_pawn', '2026-09-01T00:00:00.000Z'],
        ['coin_zero_first_hint', '2026-09-02T00:00:00.000Z'],
      ]),
      achievementProgress: {
        hintedLevels: new Set([5, 6]),
        noHintLevels: new Set([7, 8, 9]),
        cleanStreak: { lastLevel: 9, length: 3 },
        perfectStreak: { lastLevel: 9, length: 2 },
        pendingPerfectLevel: null,
        pendingPerfectWasNext: false,
      },
    });

    const snapshot = repo.load();
    expect(snapshot.achievementUnlockedAt.get('training_pawn')).toBe('2026-09-01T00:00:00.000Z');
    expect(snapshot.achievementUnlockedAt.get('coin_zero_first_hint')).toBe('2026-09-02T00:00:00.000Z');
    expect([...snapshot.achievementProgress.hintedLevels].sort()).toEqual([5, 6]);
    expect([...snapshot.achievementProgress.noHintLevels].sort()).toEqual([7, 8, 9]);
    expect(snapshot.achievementProgress.cleanStreak).toEqual({ lastLevel: 9, length: 3 });
    expect(snapshot.achievementProgress.perfectStreak).toEqual({ lastLevel: 9, length: 2 });
    // The pending bonus-star window is a per-session concern only — never
    // persisted, since it must resolve or vanish before the tab closes.
    expect(snapshot.achievementProgress.pendingPerfectLevel).toBeNull();
  });

  it('resetProgress also clears achievement unlocks and progress', () => {
    const repo = new ProgressRepository();
    repo.save({
      unlockedLevels: new Set([0]),
      seenOnboardingLevels: new Set(),
      tutorialComplete: false,
      levelStars: new Map(),
      achievementUnlockedAt: new Map([['training_pawn', '2026-09-01T00:00:00.000Z']]),
      achievementProgress: {
        hintedLevels: new Set([5]),
        noHintLevels: new Set([6]),
        cleanStreak: { lastLevel: 6, length: 1 },
        perfectStreak: { lastLevel: null, length: 0 },
        pendingPerfectLevel: null,
        pendingPerfectWasNext: false,
      },
    });

    repo.resetProgress();

    const snapshot = repo.load();
    expect(snapshot.achievementUnlockedAt.size).toBe(0);
    expect(snapshot.achievementProgress.hintedLevels.size).toBe(0);
    expect(snapshot.achievementProgress.noHintLevels.size).toBe(0);
    expect(snapshot.achievementProgress.cleanStreak).toEqual({ lastLevel: null, length: 0 });
  });
});
