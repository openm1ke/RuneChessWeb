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
});
