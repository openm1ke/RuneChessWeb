import { useEffect, useMemo, useRef, useState } from 'react';
import { DozorEngine, FIRST_SCORED_LEVEL_INDEX } from './game/dozorEngine';
import { campaignLevels } from './data/campaignLevels';
import { ProgressRepository } from './services/progressRepository';
import { MusicService, setSoundEffectsEnabled } from './services/musicService';
import { AnalyticsService, type LevelEntrySource } from './services/analyticsService';
import { RewardedAdsService } from './services/rewardedAdsService';
import {
  applyPlatformLanguage,
  getYandexGamesSdk,
  isRealYandexGamesPlatform,
  startYandexGamesPlatform,
  type YandexGamesSdk,
} from './services/yandexGamesSdk';
import { ConsentBanner } from './components/shared/ConsentBanner';
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
    engine.onHintUsed = (levelIndex, hintUsedCount, viaAd) =>
      analyticsService.hintUsed(levelIndex, hintUsedCount, viaAd);
    engine.onLevelReset = (levelIndex, metrics) => analyticsService.levelReset(levelIndex, metrics);
    engine.onBonusStarApplied = (levelIndex, starsBefore, starsAfter) => {
      analyticsService.bonusStarGranted(levelIndex, starsBefore, starsAfter);
      setLevelStars((prev) => {
        const merged = mergeBestStars(prev.get(levelIndex), starsAfter);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs mirroring state for use inside the onLevelSolved closure/persist calls.
  const unlockedLevelsRef = useRef(unlockedLevels);
  const seenOnboardingRef = useRef(seenOnboardingLevels);
  const tutorialCompleteRef = useRef(tutorialComplete);
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
    const before = engine.levelIndex;
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
        setScreen('tutorialComplete');
      }
      persist({ unlockedLevels: nextUnlocked, seenOnboardingLevels: nextSeen, tutorialComplete: nextTutorialComplete });
    } else if (before === campaignLevels.length - 1) {
      analyticsService.campaignCompleted();
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
    setUnlockedLevels(initialUnlocked);
    setHighestLevel(0);
    setSeenOnboardingLevels(initialSeen);
    setTutorialComplete(false);
    setLevelStars(initialStars);
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
    </>
  );

  switch (screen) {
    case 'campaignComplete':
      return withConsent(
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
      return withConsent(
        <TutorialCompleteScreen
          onContinue={() => setScreen('game')}
          onLevels={() => {
            void musicService.stopGame(true);
            setScreen('levels');
          }}
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
        />
      );
    case 'menu':
    default:
      return withConsent(<MenuScreen onPlay={() => goToGame()} onLevels={openLevelSelect} onSettings={() => setScreen('settings')} />);
  }
}
