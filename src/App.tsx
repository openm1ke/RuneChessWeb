import { useEffect, useMemo, useRef, useState } from 'react';
import { DozorEngine, FIRST_SCORED_LEVEL_INDEX } from './game/dozorEngine';
import { campaignLevels, MAIN_CAMPAIGN_LEVEL_COUNT } from './data/campaignLevels';
import { ProgressRepository } from './services/progressRepository';
import { MusicService, setSoundEffectsEnabled, playAchievementReveal } from './services/musicService';
import { AnalyticsService, type AchievementUnlockTrigger, type LevelEntrySource } from './services/analyticsService';
import { RewardedAdsService } from './services/rewardedAdsService';
import {
  applyPlatformLanguage,
  getYandexGamesSdk,
  isRealYandexGamesPlatform,
  startYandexGamesPlatform,
  type YandexGamesSdk,
} from './services/yandexGamesSdk';
import { ConsentBanner } from './components/shared/ConsentBanner';
import { AchievementCelebrationOverlay } from './components/shared/AchievementReveal';
import { MenuScreen } from './screens/MenuScreen';
import { LevelSelectScreen } from './screens/LevelSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameScreen } from './screens/GameScreen';
import { CampaignCompleteScreen } from './screens/CampaignCompleteScreen';
import { TutorialCompleteScreen } from './screens/TutorialCompleteScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import type { LevelAttemptResult } from './game/starRating';
import { mergeBestStars } from './game/starRating';
import {
  allAchievements,
  achievementCategory,
  trainingPawn,
  mainKing,
  extraQueen,
  unlockedIds,
  type AchievementDefinition,
} from './data/achievements';
import {
  initialAchievementProgress,
  recordHintUsed,
  recordLevelSolved,
  recordBonusStarApplied,
  recordReset,
  finalizePending,
  type AchievementProgressState,
} from './game/achievementProgress';

type Screen =
  | 'menu'
  | 'levels'
  | 'settings'
  | 'game'
  | 'tutorialComplete'
  | 'mainCampaignComplete'
  | 'campaignComplete'
  | 'achievements';

const isDev = import.meta.env.DEV;

/** Temporary global kill-switch for rewarded ads, on both the plain site
 * (RSYA, via `RewardedAdsService`/`Ya.Context.AdvManager`) and — already via
 * `isOnYandexGamesPlatform` below — the Yandex Games platform. Neither has
 * an approved ad contract/blockId yet, so `RewardedAdsService.show()` never
 * resolves to a reward: the hint button would sit there doing nothing.
 * Flip this back to `true` once a real РСЯ contract (and/or a `ysdk.adv`
 * integration for the platform) exists — that's the only change needed;
 * every call site already falls back to the free-toggle hint/no bonus-star
 * offer whenever `rewardedAdsService` is undefined, exactly like a tutorial
 * level. See YANDEX_GAMES_PLATFORM_PLAN.md.
 */
const ADS_AVAILABLE = false;

function initialScreen(): Screen {
  return typeof window !== 'undefined' && window.location.hash === '#levels' ? 'levels' : 'menu';
}

function setLevelSelectAddress(isOpen: boolean): void {
  if (typeof window === 'undefined') return;
  const address = `${window.location.pathname}${window.location.search}${isOpen ? '#levels' : ''}`;
  window.history.replaceState(null, '', address);
}

export default function App() {
  const progressRepository = useMemo(() => new ProgressRepository(), []);
  const musicService = useMemo(() => new MusicService(), []);
  const analyticsService = useMemo(() => new AnalyticsService(), []);
  const rewardedAdsService = useMemo(() => new RewardedAdsService(analyticsService), [analyticsService]);
  const engine = useMemo(() => new DozorEngine(), []);

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [unlockedLevels, setUnlockedLevels] = useState<Set<number>>(new Set([0]));
  const [seenOnboardingLevels, setSeenOnboardingLevels] = useState<Set<number>>(new Set());
  const [levelStars, setLevelStars] = useState<Map<number, number>>(new Map());
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [highestLevel, setHighestLevel] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.6);
  const [soundEffectsEnabled, setSoundEffectsEnabledState] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean | null>(null);
  const [achievementUnlockedAt, setAchievementUnlockedAt] = useState<Map<string, string>>(new Map());
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgressState>(initialAchievementProgress);
  const [levelResultAchievement, setLevelResultAchievement] = useState<AchievementDefinition | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<AchievementDefinition[]>([]);
  // The tutorial/main-campaign/full-completion screens always show their
  // tied achievement (trainingPawn/mainKing/extraQueen) — these flags only
  // control whether the reveal-from-locked animation plays right now
  // (i.e. it was earned by finishing this very screen's checkpoint), mirroring
  // the mobile app's `_tutorialAchievementJustEarned`-style flags.
  const [tutorialJustEarned, setTutorialJustEarned] = useState(false);
  const [mainCampaignJustEarned, setMainCampaignJustEarned] = useState(false);
  const [extraCampaignJustEarned, setExtraCampaignJustEarned] = useState(false);
  const [yandexGamesSdk, setYandexGamesSdk] = useState<YandexGamesSdk | null>(null);
  // Separate from the sdk existing at all (see isRealYandexGamesPlatform's
  // doc comment) — this is specifically the "are we actually embedded in
  // games.yandex.ru right now" check. Gates the RSYA rewarded-ads flow
  // (`RewardedAdsService`, built for the plain site via `Ya.Context.AdvManager`)
  // off entirely on the real platform: that RSYA integration cannot show
  // anything inside the Yandex Games iframe — there is no РСЯ contract for
  // this surface, only a separate `ysdk.adv` integration would work here,
  // and that hasn't been built yet. Until it is, hints/bonus star fall back
  // to the same free toggle tutorial levels already use everywhere — see
  // GameScreen's handling of a missing `rewardedAdsService` prop.
  const [isOnYandexGamesPlatform, setIsOnYandexGamesPlatform] = useState(false);

  useEffect(() => {
    musicService.init();

    // Yandex Games platform integration (no-op on the plain runechess.ru
    // site — see getYandexGamesSdk's doc comment). LoadingAPI.ready() fires
    // as soon as we resolve here: the menu is the app's first paint and is
    // immediately interactive, so there is no later "gameplay is ready"
    // moment to wait for. See YANDEX_GAMES_PLATFORM_PLAN.md.
    void getYandexGamesSdk().then((sdk) => {
      if (!sdk) return;
      setYandexGamesSdk(sdk);
      setIsOnYandexGamesPlatform(isRealYandexGamesPlatform(sdk));
      applyPlatformLanguage(sdk);
      startYandexGamesPlatform(sdk, {
        onPause: () => musicService.pauseAll(),
        onResume: () => musicService.resumeAll(),
      });
    });
    const snapshot = progressRepository.load();
    setUnlockedLevels(snapshot.unlockedLevels);
    setHighestLevel(snapshot.highestLevel);
    setSeenOnboardingLevels(snapshot.seenOnboardingLevels);
    setTutorialComplete(snapshot.tutorialComplete);
    setLevelStars(snapshot.levelStars);
    levelStarsRef.current = snapshot.levelStars;
    setAchievementUnlockedAt(snapshot.achievementUnlockedAt);
    achievementUnlockedAtRef.current = snapshot.achievementUnlockedAt;
    setAchievementProgress(snapshot.achievementProgress);
    achievementProgressRef.current = snapshot.achievementProgress;
    setMusicEnabled(snapshot.musicEnabled);
    setMusicVolume(snapshot.musicVolume);
    setSoundEffectsEnabledState(snapshot.soundEffectsEnabled);
    setSoundEffectsEnabled(snapshot.soundEffectsEnabled);
    setAnalyticsConsent(snapshot.analyticsConsent);
    if (snapshot.analyticsConsent) analyticsService.enable();
    musicService.enabled = snapshot.musicEnabled;
    musicService.volume = snapshot.musicVolume;
    if (snapshot.musicEnabled) void musicService.startMenu();

    engine.onLevelSolved = (levelIndex: number, result: LevelAttemptResult) => {
      analyticsService.levelCompleted(levelIndex, result, levelEntrySourceRef.current);
      if (result.stars == null) return;

      const newProgress = recordLevelSolved(finalizePending(achievementProgressRef.current), levelIndex, result);
      achievementProgressRef.current = newProgress;
      setAchievementProgress(newProgress);

      setLevelStars((prev) => {
        const merged = mergeBestStars(prev.get(levelIndex), result.stars!);
        const next = merged === prev.get(levelIndex) ? prev : new Map(prev).set(levelIndex, merged);
        levelStarsRef.current = next;
        progressRepository.save({
          unlockedLevels: unlockedLevelsRef.current,
          seenOnboardingLevels: seenOnboardingRef.current,
          tutorialComplete: tutorialCompleteRef.current,
          levelStars: next,
          achievementUnlockedAt: achievementUnlockedAtRef.current,
          achievementProgress: newProgress,
        });
        recordNewAchievements(next, newProgress, 'level_solved');
        return next;
      });
    };
    engine.onHintUsed = (levelIndex, hintUsedCount, viaAd) => {
      analyticsService.hintUsed(levelIndex, hintUsedCount, viaAd);
      // Hints on the 5 tutorial levels never count towards a coin
      // achievement — see docs/ACHIEVEMENTS_SPEC.md.
      if (levelIndex < FIRST_SCORED_LEVEL_INDEX) return;
      const newProgress = recordHintUsed(achievementProgressRef.current, levelIndex);
      if (newProgress === achievementProgressRef.current) return;
      achievementProgressRef.current = newProgress;
      setAchievementProgress(newProgress);
      progressRepository.save({
        unlockedLevels: unlockedLevelsRef.current,
        seenOnboardingLevels: seenOnboardingRef.current,
        tutorialComplete: tutorialCompleteRef.current,
        levelStars: levelStarsRef.current,
        achievementUnlockedAt: achievementUnlockedAtRef.current,
        achievementProgress: newProgress,
      });
      recordNewAchievements(levelStarsRef.current, newProgress, 'hint_used');
    };
    engine.onLevelReset = (levelIndex, metrics) => {
      analyticsService.levelReset(levelIndex, metrics);
      // Both "Сбросить" and "Пройти ещё раз" break both series
      // unconditionally, regardless of which level it happens on.
      const newProgress = recordReset(achievementProgressRef.current);
      achievementProgressRef.current = newProgress;
      setAchievementProgress(newProgress);
      progressRepository.save({
        unlockedLevels: unlockedLevelsRef.current,
        seenOnboardingLevels: seenOnboardingRef.current,
        tutorialComplete: tutorialCompleteRef.current,
        levelStars: levelStarsRef.current,
        achievementUnlockedAt: achievementUnlockedAtRef.current,
        achievementProgress: newProgress,
      });
    };
    engine.onBonusStarApplied = (levelIndex, starsBefore, starsAfter) => {
      analyticsService.bonusStarGranted(levelIndex, starsBefore, starsAfter);

      const newProgress = recordBonusStarApplied(achievementProgressRef.current, levelIndex, starsAfter);
      achievementProgressRef.current = newProgress;
      setAchievementProgress(newProgress);

      setLevelStars((prev) => {
        const merged = mergeBestStars(prev.get(levelIndex), starsAfter);
        const next = merged === prev.get(levelIndex) ? prev : new Map(prev).set(levelIndex, merged);
        levelStarsRef.current = next;
        progressRepository.save({
          unlockedLevels: unlockedLevelsRef.current,
          seenOnboardingLevels: seenOnboardingRef.current,
          tutorialComplete: tutorialCompleteRef.current,
          levelStars: next,
          achievementUnlockedAt: achievementUnlockedAtRef.current,
          achievementProgress: newProgress,
        });
        recordNewAchievements(next, newProgress, 'bonus_star');
        return next;
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs mirroring state for use inside the onLevelSolved closure/persist calls.
  const unlockedLevelsRef = useRef(unlockedLevels);
  const seenOnboardingRef = useRef(seenOnboardingLevels);
  const tutorialCompleteRef = useRef(tutorialComplete);
  const levelStarsRef = useRef(levelStars);
  const achievementUnlockedAtRef = useRef(achievementUnlockedAt);
  const achievementProgressRef = useRef(achievementProgress);
  const levelEntrySourceRef = useRef<LevelEntrySource>('menu_play');
  useEffect(() => {
    unlockedLevelsRef.current = unlockedLevels;
  }, [unlockedLevels]);
  useEffect(() => {
    seenOnboardingRef.current = seenOnboardingLevels;
  }, [seenOnboardingLevels]);
  useEffect(() => {
    tutorialCompleteRef.current = tutorialComplete;
  }, [tutorialComplete]);
  useEffect(() => {
    levelStarsRef.current = levelStars;
  }, [levelStars]);
  useEffect(() => {
    achievementUnlockedAtRef.current = achievementUnlockedAt;
  }, [achievementUnlockedAt]);
  useEffect(() => {
    achievementProgressRef.current = achievementProgress;
  }, [achievementProgress]);

  /**
   * Diffs `unlockedIds(...)` against `achievementUnlockedAtRef` to find ids
   * that just became unlocked, records them (with the current timestamp)
   * and persists, then routes each into the right reveal slot: the first
   * "regular" achievement (everything except the tutorial/campaign/streak
   * milestones, which get their own dedicated screen) goes inline into the
   * level-result overlay, any further ones queue behind a full-screen
   * celebration popup — a port of the mobile app's `_recordNewAchievements`.
   */
  const recordNewAchievements = (
    solvedLevelStars: Map<number, number>,
    solvedAchievementProgress: AchievementProgressState,
    trigger: AchievementUnlockTrigger,
    tutorialCompleteOverride?: boolean,
  ): void => {
    const tutorialCompleteValue = tutorialCompleteOverride ?? tutorialCompleteRef.current;
    const ids = unlockedIds({
      tutorialComplete: tutorialCompleteValue,
      levelStars: solvedLevelStars,
      hintedLevelsCount: solvedAchievementProgress.hintedLevels.size,
      noHintLevelsCount: solvedAchievementProgress.noHintLevels.size,
      cleanStreakLength: solvedAchievementProgress.cleanStreak.length,
      perfectStreakLength: solvedAchievementProgress.perfectStreak.length,
    });

    const newlyUnlocked: AchievementDefinition[] = [];
    const nextUnlockedAt = new Map(achievementUnlockedAtRef.current);
    const now = new Date().toISOString();
    for (const id of ids) {
      if (nextUnlockedAt.has(id)) continue;
      nextUnlockedAt.set(id, now);
      const definition = allAchievements.find((a) => a.id === id);
      if (definition) newlyUnlocked.push(definition);
    }
    if (newlyUnlocked.length === 0) return;

    for (const achievement of newlyUnlocked) {
      analyticsService.achievementUnlocked(achievement.id, achievementCategory(achievement.id), trigger);
    }
    analyticsService.achievementProgressSnapshot(nextUnlockedAt.size);

    achievementUnlockedAtRef.current = nextUnlockedAt;
    setAchievementUnlockedAt(nextUnlockedAt);
    progressRepository.save({
      unlockedLevels: unlockedLevelsRef.current,
      seenOnboardingLevels: seenOnboardingRef.current,
      tutorialComplete: tutorialCompleteValue,
      levelStars: solvedLevelStars,
      achievementUnlockedAt: nextUnlockedAt,
      achievementProgress: solvedAchievementProgress,
    });

    // Pawn/king/queen get their own dedicated reveal on the
    // tutorial/main-campaign/full-completion screens (always shown there,
    // see those screens' `achievement` prop below) — never queued into the
    // level-result overlay/celebration popup like a "regular" achievement.
    const dedicated = new Set([trainingPawn.id, mainKing.id, extraQueen.id]);
    const regular = newlyUnlocked.filter((a) => !dedicated.has(a.id));
    if (regular.length > 0) {
      setLevelResultAchievement(regular[0]);
      if (regular.length > 1) setCelebrationQueue((prev) => [...prev, ...regular.slice(1)]);
    }
    if (newlyUnlocked.some((a) => a.id === trainingPawn.id)) setTutorialJustEarned(true);
    if (newlyUnlocked.some((a) => a.id === mainKing.id)) setMainCampaignJustEarned(true);
    if (newlyUnlocked.some((a) => a.id === extraQueen.id)) setExtraCampaignJustEarned(true);
  };

  // Brackets actual gameplay for the Yandex Games platform's own engagement
  // metrics — distinct from `game_api_pause`/`resume` above, which react to
  // the platform interrupting us, not to our own screen navigation.
  useEffect(() => {
    if (!yandexGamesSdk) return;
    if (screen === 'game') yandexGamesSdk.features.GameplayAPI.start();
    else yandexGamesSdk.features.GameplayAPI.stop();
  }, [yandexGamesSdk, screen]);

  useEffect(() => {
    if (analyticsConsent && screen === 'levels') analyticsService.levelSelectOpened();
  }, [analyticsConsent, analyticsService, screen]);

  useEffect(() => {
    if (analyticsConsent && screen === 'settings') analyticsService.settingsOpened();
  }, [analyticsConsent, analyticsService, screen]);

  useEffect(() => {
    if (analyticsConsent && screen === 'achievements') analyticsService.achievementsOpened();
  }, [analyticsConsent, analyticsService, screen]);

  const persist = (overrides: Partial<{ unlockedLevels: Set<number>; seenOnboardingLevels: Set<number>; tutorialComplete: boolean; levelStars: Map<number, number> }>) => {
    progressRepository.save({
      unlockedLevels: overrides.unlockedLevels ?? unlockedLevelsRef.current,
      seenOnboardingLevels: overrides.seenOnboardingLevels ?? seenOnboardingRef.current,
      tutorialComplete: overrides.tutorialComplete ?? tutorialCompleteRef.current,
      levelStars: overrides.levelStars ?? levelStars,
    });
  };

  const goToGame = (levelIndex?: number, entrySource: LevelEntrySource = 'menu_play') => {
    setLevelSelectAddress(false);
    void musicService.stopMenu();
    const requested = levelIndex ?? highestLevel;
    engine.goToLevel(!tutorialComplete && requested >= 5 ? 4 : requested);
    levelEntrySourceRef.current = entrySource;
    const isTutorial = engine.levelIndex < FIRST_SCORED_LEVEL_INDEX;
    if (entrySource === 'level_select') analyticsService.levelSelected(engine.levelIndex, isTutorial);
    analyticsService.levelStarted(engine.levelIndex, isTutorial, entrySource);
    setScreen('game');
    void musicService.startGame();
  };

  const goToMenu = () => {
    void musicService.stopGame();
    setScreen('menu');
    void musicService.startMenu();
  };

  const openLevelSelect = () => {
    void musicService.stopMenu();
    setLevelSelectAddress(true);
    setScreen('levels');
  };
  const closeLevelSelect = () => {
    setLevelSelectAddress(false);
    setScreen('menu');
    void musicService.startMenu();
  };

  const nextLevel = () => {
    setLevelResultAchievement(null);
    const before = engine.levelIndex;
    // Mirrors the mobile app's `_nextLevel()`: the checkpoint is checked
    // BEFORE advancing the engine, and returns early without touching it —
    // the engine only actually moves onto the first bonus-campaign level
    // once the player taps "ПРОДОЛЖИТЬ" (`continueAfterMainCampaign`), so a
    // stray extra `nextLevel()` call here would silently skip level 113.
    if (before === MAIN_CAMPAIGN_LEVEL_COUNT - 1) {
      analyticsService.mainCampaignCompleted();
      setScreen('mainCampaignComplete');
      return;
    }
    engine.nextLevel();
    if (engine.levelIndex > before) {
      levelEntrySourceRef.current = 'next_level';
      analyticsService.levelStarted(engine.levelIndex, engine.levelIndex < FIRST_SCORED_LEVEL_INDEX, 'next_level');
      const nextUnlocked = new Set(unlockedLevels);
      nextUnlocked.add(engine.levelIndex);
      setUnlockedLevels(nextUnlocked);
      const nextHighest = Math.max(highestLevel, engine.levelIndex);
      setHighestLevel(nextHighest);
      let nextSeen = seenOnboardingLevels;
      if (before < FIRST_SCORED_LEVEL_INDEX) {
        nextSeen = new Set(seenOnboardingLevels);
        nextSeen.add(before);
        setSeenOnboardingLevels(nextSeen);
      }
      let nextTutorialComplete = tutorialComplete;
      if (before === FIRST_SCORED_LEVEL_INDEX - 1) {
        nextTutorialComplete = true;
        setTutorialComplete(true);
        analyticsService.tutorialCompleted();
        recordNewAchievements(levelStarsRef.current, achievementProgressRef.current, 'tutorial_completed', true);
        setScreen('tutorialComplete');
      }
      persist({ unlockedLevels: nextUnlocked, seenOnboardingLevels: nextSeen, tutorialComplete: nextTutorialComplete });
    } else if (before === campaignLevels.length - 1) {
      analyticsService.campaignCompleted();
      setScreen('campaignComplete');
    }
  };

  /** "ПРОДОЛЖИТЬ" on the main-campaign-complete checkpoint — actually
   * advances the engine onto level 113 (the first bonus-campaign level) and
   * unlocks it, mirroring the mobile app's `_continueAfterMainCampaign()`. */
  const continueAfterMainCampaign = () => {
    engine.nextLevel();
    levelEntrySourceRef.current = 'next_level';
    analyticsService.levelStarted(engine.levelIndex, false, 'next_level');
    const nextUnlocked = new Set(unlockedLevels);
    nextUnlocked.add(engine.levelIndex);
    setUnlockedLevels(nextUnlocked);
    setHighestLevel(Math.max(highestLevel, engine.levelIndex));
    setMainCampaignJustEarned(false);
    persist({ unlockedLevels: nextUnlocked, tutorialComplete: true });
    setScreen('game');
  };

  const skipLevel = () => {
    const before = engine.levelIndex;
    if (before >= campaignLevels.length - 1) {
      analyticsService.campaignCompleted();
      setScreen('campaignComplete');
      return;
    }
    if (before === MAIN_CAMPAIGN_LEVEL_COUNT - 1) {
      analyticsService.mainCampaignCompleted();
    }
    engine.nextLevel();
    levelEntrySourceRef.current = 'skip_level';
    analyticsService.levelStarted(engine.levelIndex, engine.levelIndex < FIRST_SCORED_LEVEL_INDEX, 'skip_level');
    const nextUnlocked = new Set(unlockedLevels);
    nextUnlocked.add(engine.levelIndex);
    setUnlockedLevels(nextUnlocked);
    setHighestLevel(Math.max(highestLevel, engine.levelIndex));
    let nextSeen = seenOnboardingLevels;
    if (before < FIRST_SCORED_LEVEL_INDEX) {
      nextSeen = new Set(seenOnboardingLevels);
      nextSeen.add(before);
      setSeenOnboardingLevels(nextSeen);
    }
    const nextTutorialComplete = before === FIRST_SCORED_LEVEL_INDEX - 1 ? true : tutorialComplete;
    if (nextTutorialComplete !== tutorialComplete) {
      setTutorialComplete(true);
      analyticsService.tutorialCompleted();
      recordNewAchievements(levelStarsRef.current, achievementProgressRef.current, 'tutorial_completed', true);
    }
    persist({ unlockedLevels: nextUnlocked, seenOnboardingLevels: nextSeen, tutorialComplete: nextTutorialComplete });
  };

  const resetOnboardingForDebug = () => {
    if (!isDev) return;
    setSeenOnboardingLevels(new Set());
    persist({ seenOnboardingLevels: new Set() });
  };

  const setMusicEnabledAndSave = (enabled: boolean) => {
    setMusicEnabled(enabled);
    musicService.enabled = enabled;
    progressRepository.saveMusicSettings({ musicEnabled: enabled, musicVolume });
    if (enabled) analyticsService.musicEnabled();
    else analyticsService.musicDisabled();
    if (!enabled) {
      void musicService.stopMenu();
      void musicService.stopGame();
    } else if (screen === 'game') {
      void musicService.startGame();
    } else {
      // Settings is only ever reached from the menu (and behaves like it
      // musically), so it shares the menu track — otherwise flipping the
      // toggle on while still on the settings screen played nothing until
      // the player navigated away.
      void musicService.startMenu();
    }
  };

  const setSoundEffectsEnabledAndSave = (enabled: boolean) => {
    setSoundEffectsEnabledState(enabled);
    setSoundEffectsEnabled(enabled);
    progressRepository.saveSoundEffectsEnabled(enabled);
  };

  const setMusicVolumeAndSave = (volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    setMusicVolume(clamped);
    musicService.volume = clamped;
    progressRepository.saveMusicSettings({ musicEnabled, musicVolume: clamped });
    musicService.applyVolume();
  };

  const resetProgress = () => {
    analyticsService.progressResetConfirmed();
    progressRepository.resetProgress();
    const initialUnlocked = new Set([0]);
    const initialSeen = new Set<number>();
    const initialStars = new Map<number, number>();
    unlockedLevelsRef.current = initialUnlocked;
    seenOnboardingRef.current = initialSeen;
    tutorialCompleteRef.current = false;
    levelStarsRef.current = initialStars;
    achievementUnlockedAtRef.current = new Map();
    achievementProgressRef.current = initialAchievementProgress;
    setUnlockedLevels(initialUnlocked);
    setHighestLevel(0);
    setSeenOnboardingLevels(initialSeen);
    setTutorialComplete(false);
    setLevelStars(initialStars);
    setAchievementUnlockedAt(new Map());
    setAchievementProgress(initialAchievementProgress);
    setLevelResultAchievement(null);
    setCelebrationQueue([]);
    setTutorialJustEarned(false);
    setMainCampaignJustEarned(false);
    setExtraCampaignJustEarned(false);
    engine.goToLevel(0);
    goToMenu();
  };

  const setAnalyticsConsentAndSave = (consent: boolean) => {
    setAnalyticsConsent(consent);
    progressRepository.saveAnalyticsConsent(consent);
    if (consent) analyticsService.enable();
  };

  const withConsent = (content: React.ReactNode) => (
    <>
      {content}
      {analyticsConsent == null && (
        <ConsentBanner
          onAcceptAnalytics={() => setAnalyticsConsentAndSave(true)}
          onDeclineAnalytics={() => setAnalyticsConsentAndSave(false)}
        />
      )}
      {celebrationQueue.length > 0 && (
        <AchievementCelebrationOverlay
          achievement={celebrationQueue[0]}
          onDismiss={() => setCelebrationQueue((prev) => prev.slice(1))}
          onRevealed={playAchievementReveal}
        />
      )}
    </>
  );

  switch (screen) {
    case 'campaignComplete':
      return withConsent(
        <CampaignCompleteScreen
          achievement={extraQueen}
          animateAchievement={extraCampaignJustEarned}
          onAchievementRevealed={playAchievementReveal}
          onLevels={() => {
            setExtraCampaignJustEarned(false);
            void musicService.stopGame(true);
            setScreen('levels');
          }}
          onMenu={() => {
            setExtraCampaignJustEarned(false);
            void musicService.stopGame(true);
            setScreen('menu');
            void musicService.startMenu();
          }}
        />
      );
    case 'mainCampaignComplete':
      return withConsent(
        <CampaignCompleteScreen
          title={'ОСНОВНАЯ КАМПАНИЯ\nПРОЙДЕНА'}
          subtitle="Новая кампания с полем 7×7 открыта."
          primaryLabel="ПРОДОЛЖИТЬ"
          onPrimary={continueAfterMainCampaign}
          achievement={mainKing}
          animateAchievement={mainCampaignJustEarned}
          onAchievementRevealed={playAchievementReveal}
          onLevels={() => {
            setMainCampaignJustEarned(false);
            void musicService.stopGame(true);
            setScreen('levels');
          }}
          onMenu={() => {
            setMainCampaignJustEarned(false);
            void musicService.stopGame(true);
            setScreen('menu');
            void musicService.startMenu();
          }}
        />
      );
    case 'tutorialComplete':
      return withConsent(
        <TutorialCompleteScreen
          achievement={trainingPawn}
          animateAchievement={tutorialJustEarned}
          onAchievementRevealed={playAchievementReveal}
          onContinue={() => {
            setTutorialJustEarned(false);
            setScreen('game');
          }}
          onLevels={() => {
            setTutorialJustEarned(false);
            void musicService.stopGame(true);
            setScreen('levels');
          }}
        />
      );
    case 'achievements':
      return withConsent(
        <AchievementsScreen
          tutorialComplete={tutorialComplete}
          levelStars={levelStars}
          achievementProgress={achievementProgress}
          achievementUnlockedAt={achievementUnlockedAt}
          onBack={goToMenu}
          onAchievementViewed={(id, unlocked) => analyticsService.achievementViewed(id, unlocked)}
        />
      );
    case 'settings':
      return withConsent(
        <SettingsScreen
          musicEnabled={musicEnabled}
          musicVolume={musicVolume}
          onMusicEnabledChanged={setMusicEnabledAndSave}
          onVolumeChanged={setMusicVolumeAndSave}
          soundEffectsEnabled={soundEffectsEnabled}
          onSoundEffectsEnabledChanged={setSoundEffectsEnabledAndSave}
          onProgressReset={resetProgress}
          onBack={goToMenu}
        />
      );
    case 'levels':
      return withConsent(
        <LevelSelectScreen
          unlockedLevels={unlockedLevels}
          highestUnlocked={highestLevel}
          tutorialComplete={tutorialComplete}
          levelStars={levelStars}
          onBack={closeLevelSelect}
          onLevelChosen={(levelIndex) => goToGame(levelIndex, 'level_select')}
        />
      );
    case 'game':
      return withConsent(
        <GameScreen
          engine={engine}
          onBack={goToMenu}
          onNextLevel={nextLevel}
          onSkipLevel={isDev ? skipLevel : undefined}
          onResetOnboarding={resetOnboardingForDebug}
          seenOnboardingLevels={seenOnboardingLevels}
          rewardedAdsService={ADS_AVAILABLE && !isOnYandexGamesPlatform ? rewardedAdsService : undefined}
          achievement={levelResultAchievement}
          onAchievementRevealed={playAchievementReveal}
        />
      );
    case 'menu':
    default:
      return withConsent(
        <MenuScreen
          onPlay={() => goToGame()}
          onLevels={openLevelSelect}
          onSettings={() => setScreen('settings')}
          onAchievements={() => setScreen('achievements')}
        />
      );
  }
}
