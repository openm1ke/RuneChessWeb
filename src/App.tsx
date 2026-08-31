import { useEffect, useMemo, useRef, useState } from 'react';
import { DozorEngine, FIRST_SCORED_LEVEL_INDEX } from './game/dozorEngine';
import { campaignLevels } from './data/campaignLevels';
import { ProgressRepository } from './services/progressRepository';
import { MusicService } from './services/musicService';
import { AnalyticsService } from './services/analyticsService';
import { MenuScreen } from './screens/MenuScreen';
import { LevelSelectScreen } from './screens/LevelSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GameScreen } from './screens/GameScreen';
import { CampaignCompleteScreen } from './screens/CampaignCompleteScreen';
import { TutorialCompleteScreen } from './screens/TutorialCompleteScreen';
import type { LevelAttemptResult } from './game/starRating';
import { mergeBestStars } from './game/starRating';

type Screen = 'menu' | 'levels' | 'settings' | 'game' | 'tutorialComplete' | 'campaignComplete';

const isDev = import.meta.env.DEV;

export default function App() {
  const progressRepository = useMemo(() => new ProgressRepository(), []);
  const musicService = useMemo(() => new MusicService(), []);
  const analyticsService = useMemo(() => new AnalyticsService(), []);
  const engine = useMemo(() => new DozorEngine(), []);

  const [screen, setScreen] = useState<Screen>('menu');
  const [unlockedLevels, setUnlockedLevels] = useState<Set<number>>(new Set([0]));
  const [seenOnboardingLevels, setSeenOnboardingLevels] = useState<Set<number>>(new Set());
  const [levelStars, setLevelStars] = useState<Map<number, number>>(new Map());
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [highestLevel, setHighestLevel] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.6);

  useEffect(() => {
    musicService.init();
    const snapshot = progressRepository.load();
    setUnlockedLevels(snapshot.unlockedLevels);
    setHighestLevel(snapshot.highestLevel);
    setSeenOnboardingLevels(snapshot.seenOnboardingLevels);
    setTutorialComplete(snapshot.tutorialComplete);
    setLevelStars(snapshot.levelStars);
    setMusicEnabled(snapshot.musicEnabled);
    setMusicVolume(snapshot.musicVolume);
    musicService.enabled = snapshot.musicEnabled;
    musicService.volume = snapshot.musicVolume;
    if (snapshot.musicEnabled) void musicService.startMenu();

    engine.onLevelSolved = (levelIndex: number, result: LevelAttemptResult) => {
      analyticsService.levelCompleted(levelIndex, result);
      if (result.stars == null) return;
      setLevelStars((prev) => {
        const merged = mergeBestStars(prev.get(levelIndex), result.stars!);
        if (merged === prev.get(levelIndex)) return prev;
        const next = new Map(prev);
        next.set(levelIndex, merged);
        progressRepository.save({
          unlockedLevels: unlockedLevelsRef.current,
          seenOnboardingLevels: seenOnboardingRef.current,
          tutorialComplete: tutorialCompleteRef.current,
          levelStars: next,
        });
        return next;
      });
    };
    engine.onHintUsed = (levelIndex, hintUsedCount) => analyticsService.hintUsed(levelIndex, hintUsedCount);
    engine.onLevelReset = (levelIndex, metrics) => analyticsService.levelReset(levelIndex, metrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs mirroring state for use inside the onLevelSolved closure/persist calls.
  const unlockedLevelsRef = useRef(unlockedLevels);
  const seenOnboardingRef = useRef(seenOnboardingLevels);
  const tutorialCompleteRef = useRef(tutorialComplete);
  useEffect(() => {
    unlockedLevelsRef.current = unlockedLevels;
  }, [unlockedLevels]);
  useEffect(() => {
    seenOnboardingRef.current = seenOnboardingLevels;
  }, [seenOnboardingLevels]);
  useEffect(() => {
    tutorialCompleteRef.current = tutorialComplete;
  }, [tutorialComplete]);

  const persist = (overrides: Partial<{ unlockedLevels: Set<number>; seenOnboardingLevels: Set<number>; tutorialComplete: boolean; levelStars: Map<number, number> }>) => {
    progressRepository.save({
      unlockedLevels: overrides.unlockedLevels ?? unlockedLevelsRef.current,
      seenOnboardingLevels: overrides.seenOnboardingLevels ?? seenOnboardingRef.current,
      tutorialComplete: overrides.tutorialComplete ?? tutorialCompleteRef.current,
      levelStars: overrides.levelStars ?? levelStars,
    });
  };

  const goToGame = (levelIndex?: number) => {
    void musicService.stopMenu();
    const requested = levelIndex ?? highestLevel;
    engine.goToLevel(!tutorialComplete && requested >= 5 ? 4 : requested);
    analyticsService.levelStarted(engine.levelIndex, engine.levelIndex < FIRST_SCORED_LEVEL_INDEX);
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
    setScreen('levels');
  };
  const closeLevelSelect = () => {
    setScreen('menu');
    void musicService.startMenu();
  };

  const nextLevel = () => {
    const before = engine.levelIndex;
    engine.nextLevel();
    if (engine.levelIndex > before) {
      analyticsService.levelStarted(engine.levelIndex, engine.levelIndex < FIRST_SCORED_LEVEL_INDEX);
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
        setScreen('tutorialComplete');
      }
      persist({ unlockedLevels: nextUnlocked, seenOnboardingLevels: nextSeen, tutorialComplete: nextTutorialComplete });
    } else if (before === campaignLevels.length - 1) {
      setScreen('campaignComplete');
    }
  };

  const skipLevel = () => {
    const before = engine.levelIndex;
    if (before >= campaignLevels.length - 1) {
      setScreen('campaignComplete');
      return;
    }
    engine.nextLevel();
    analyticsService.levelStarted(engine.levelIndex, engine.levelIndex < FIRST_SCORED_LEVEL_INDEX);
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
    if (nextTutorialComplete !== tutorialComplete) setTutorialComplete(true);
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

  const setMusicVolumeAndSave = (volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    setMusicVolume(clamped);
    musicService.volume = clamped;
    progressRepository.saveMusicSettings({ musicEnabled, musicVolume: clamped });
    musicService.applyVolume();
  };

  switch (screen) {
    case 'campaignComplete':
      return (
        <CampaignCompleteScreen
          onLevels={() => {
            void musicService.stopGame(true);
            setScreen('levels');
          }}
          onMenu={() => {
            void musicService.stopGame(true);
            setScreen('menu');
            void musicService.startMenu();
          }}
        />
      );
    case 'tutorialComplete':
      return (
        <TutorialCompleteScreen
          onContinue={() => setScreen('game')}
          onLevels={() => {
            void musicService.stopGame(true);
            setScreen('levels');
          }}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          musicEnabled={musicEnabled}
          musicVolume={musicVolume}
          onMusicEnabledChanged={setMusicEnabledAndSave}
          onVolumeChanged={setMusicVolumeAndSave}
          onBack={goToMenu}
        />
      );
    case 'levels':
      return (
        <LevelSelectScreen
          unlockedLevels={unlockedLevels}
          highestUnlocked={highestLevel}
          tutorialComplete={tutorialComplete}
          levelStars={levelStars}
          onBack={closeLevelSelect}
          onLevelChosen={goToGame}
        />
      );
    case 'game':
      return (
        <GameScreen
          engine={engine}
          onBack={goToMenu}
          onNextLevel={nextLevel}
          onSkipLevel={isDev ? skipLevel : undefined}
          onResetOnboarding={resetOnboardingForDebug}
          seenOnboardingLevels={seenOnboardingLevels}
        />
      );
    case 'menu':
    default:
      return <MenuScreen onPlay={() => goToGame()} onLevels={openLevelSelect} onSettings={() => setScreen('settings')} />;
  }
}
