import { useEffect, useRef, useState } from 'react';
import { DesignCanvas, type CanvasSize } from '../components/shared/DesignCanvas';
import { artForCanvas } from '../game/cosmeticSkins';
import { trayPortraitInset } from '../components/tray/trayGeometry';
import { Board } from '../components/board/Board';
import { BoardPerspective, BOARD_LEFT, BOARD_TOP } from '../components/board/boardPerspective';
import { Tray } from '../components/tray/Tray';
import { useDragController } from '../components/board/useDragController';
import { useViewportSize } from '../components/game/useViewportSize';
import { TopControls, TopStatus, BottomUtilityControls } from '../components/game/TopBar';
import { ResetConfirmDialog } from '../components/game/ResetConfirmDialog';
import { HintOfferDialog } from '../components/game/HintOfferDialog';
import { SkipOfferDialog } from '../components/game/SkipOfferDialog';
import { LevelResultOverlay } from '../components/game/LevelResultOverlay';
import {
  TutorialCoachmark,
  portraitCoachmarkLayout,
  type CoachmarkLayout,
} from '../components/game/TutorialCoachmark';
import { useDozorEngine } from '../game/useDozorEngine';
import { FIRST_SCORED_LEVEL_INDEX, type DozorEngine } from '../game/dozorEngine';
import { useCosmeticSkin } from '../game/cosmeticSkinContext';
import type { RewardedAdsService, RewardedAdState } from '../services/rewardedAdsService';
import type { AchievementDefinition } from '../data/achievements';

const isDev = import.meta.env.DEV;

export function GameScreen({
  engine,
  onBack,
  onBonusStarOffered,
  onBonusStarFallbackGranted,
  onNextLevel,
  onSkipLevel,
  onResetOnboarding,
  seenOnboardingLevels,
  rewardedAdsService,
  achievement,
  onAchievementRevealed,
  onOpenDailyCalendar,
  dailyStreak = 0,
  hintsLeft = 0,
  hintWaitMs: hintWait = null,
  onHintSpent,
  onHintOffered,
  onSkipForAd,
  onSkipOffered,
  skipAfterResets = 3,
  onDailyStarsDoubled,
}: {
  engine: DozorEngine;
  onBack: () => void;
  /** Fired once per attempt, the first time the bonus-star offer is actually
   * put in front of the player — the step the rewarded funnel was missing.
   * See `AnalyticsService.adOfferShown`. */
  onBonusStarOffered?: () => void;
  /** The requested rewarded creative was technically unavailable, so the
   * promised star was granted without an ad. A player closing an opened ad
   * is deliberately excluded. */
  onBonusStarFallbackGranted?: (reason: 'error' | 'unavailable') => void;
  onNextLevel: () => void;
  onSkipLevel?: () => void;
  onResetOnboarding?: () => void;
  seenOnboardingLevels: Set<number>;
  rewardedAdsService?: RewardedAdsService;
  /** A newly-unlocked achievement to reveal inline in the level-result
   * overlay — passed through from `App.tsx`'s achievement bookkeeping. */
  achievement?: AchievementDefinition | null;
  onAchievementRevealed?: () => void;
  /** Only meaningful (and only rendered as a button) while
   * `engine.isDailyChallenge` — opens the streak calendar. */
  onOpenDailyCalendar?: () => void;
  /** See `TopControls.dailyStreak`. */
  dailyStreak?: number;
  /** Free hints left, and the wait for the next one — see `hintWallet.ts`. */
  hintsLeft?: number;
  hintWaitMs?: number | null;
  /** Spends one free hint; called only when a hint is about to be shown. */
  onHintSpent?: () => void;
  /** The out-of-hints offer was put in front of the player. */
  onHintOffered?: () => void;
  /** Advances past this level without a star result — the reward for the
   * skip ad. Distinct from `onSkipLevel`, which is the dev control. */
  onSkipForAd?: () => void;
  /** The skip offer was put in front of the player. */
  onSkipOffered?: () => void;
  /** Resets of one level before the game offers a way past it. */
  skipAfterResets?: number;
  /** Doubles what today's daily challenge paid out, once the ad has been
   * watched. Null when there is nothing to double — no service, or today
   * has already been doubled. */
  onDailyStarsDoubled?: (stars: number) => void;
}) {
  const { snapshot } = useDozorEngine(engine);
  const boardRef = useRef<HTMLDivElement>(null!);
  const trayRef = useRef<HTMLDivElement>(null!);
  const drag = useDragController(engine, boardRef, trayRef);
  const [beamPhase, setBeamPhase] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [extraHintState, setExtraHintState] = useState<RewardedAdState>('idle');
  const [bonusStarState, setBonusStarState] = useState<RewardedAdState>('idle');
  const [bonusStarNotice, setBonusStarNotice] = useState<string | null>(null);
  const [dailyDoubleState, setDailyDoubleState] = useState<RewardedAdState>('idle');
  const [dailyDoubleGranted, setDailyDoubleGranted] = useState(false);

  useEffect(() => {
    if (!rewardedAdsService) return;
    setExtraHintState(rewardedAdsService.stateOf('extraHint'));
    setBonusStarState(rewardedAdsService.stateOf('bonusStar'));
    return rewardedAdsService.addListener((placement, state) => {
      if (placement === 'extraHint') setExtraHintState(state);
      else if (placement === 'bonusStar') setBonusStarState(state);
      else if (placement === 'dailyDouble') setDailyDoubleState(state);
    });
  }, [rewardedAdsService]);

  const onCampaignLevel = engine.levelIndex >= FIRST_SCORED_LEVEL_INDEX;

  // The five tutorial levels keep the free, unlimited toggle: that is where
  // the button is taught. Everywhere else a hint costs one from the free
  // wallet, and the ad is the way to get one *now* rather than the only way
  // to get one at all — a dead lightbulb with no network was the worst
  // possible answer for a stuck player.
  const gated = onCampaignLevel || engine.isDailyChallenge;
  const [hintOfferOpen, setHintOfferOpen] = useState(false);
  const [skipOfferOpen, setSkipOfferOpen] = useState(false);
  /** The skip offer is made once per level, at the third reset: repeating it
   * on every later reset would turn help into nagging. */
  const skipOfferedForLevel = useRef(false);
  const handleHint = () => {
    if (!gated) {
      engine.toggleHint();
      return;
    }
    if (hintsLeft > 0) {
      onHintSpent?.();
      engine.grantHint();
      return;
    }
    // Out of free hints: offer the ad as the fast path, and say how long the
    // slow one takes. This is the moment `ad_offer_shown` describes for the
    // `extra_hint` placement.
    onHintOffered?.();
    setHintOfferOpen(true);
  };

  const watchAdForHint = () => {
    if (!rewardedAdsService) return;
    void rewardedAdsService.show('extraHint').then(() => {
      if (rewardedAdsService.stateOf('extraHint') === 'rewarded') {
        engine.grantHint();
        setHintOfferOpen(false);
      }
    });
  };

  // Three resets of the same scored level is the point where the realistic
  // alternatives are "watch a video" and "close the game". The daily
  // challenge is excluded: there is no next level to skip to.
  useEffect(() => {
    if (snapshot.resetCount === 0) skipOfferedForLevel.current = false;
    if (!onSkipForAd || !rewardedAdsService || engine.isDailyChallenge) return;
    if (engine.levelIndex < FIRST_SCORED_LEVEL_INDEX) return;
    if (skipOfferedForLevel.current || snapshot.resetCount < skipAfterResets) return;
    skipOfferedForLevel.current = true;
    onSkipOffered?.();
    setSkipOfferOpen(true);
  }, [snapshot.resetCount, engine, onSkipForAd, onSkipOffered, rewardedAdsService, skipAfterResets]);

  const watchAdForSkip = () => {
    setSkipOfferOpen(false);
    if (!rewardedAdsService) return;
    void rewardedAdsService.show('skipLevel').then(() => {
      if (rewardedAdsService.stateOf('skipLevel') === 'rewarded') onSkipForAd?.();
    });
  };

  // A solved daily challenge can be doubled once, whatever it scored —
  // three stars included, which is exactly when a player is pleased enough
  // to watch something and the old "+1 star" offer said nothing at all.
  const dailyDoubleOffered =
    rewardedAdsService != null &&
    engine.isDailyChallenge &&
    snapshot.solved &&
    onDailyStarsDoubled != null &&
    !dailyDoubleGranted &&
    (engine.levelResult?.stars ?? 0) > 0;

  const bonusStarOffered =
    rewardedAdsService != null &&
    // A solved daily challenge gets the doubling offer instead: two star
    // ads on one card is a choice nobody asked for.
    !engine.isDailyChallenge &&
    snapshot.solved &&
    engine.levelResult?.stars != null &&
    engine.levelResult.stars < 3;
  const bonusStarOfferReported = useRef(false);
  useEffect(() => {
    if (!bonusStarOffered) {
      bonusStarOfferReported.current = false;
      return;
    }
    if (bonusStarOfferReported.current) return;
    bonusStarOfferReported.current = true;
    onBonusStarOffered?.();
  }, [bonusStarOffered, onBonusStarOffered]);

  const requestBonusStar = () => {
    if (!rewardedAdsService || bonusStarState === 'loading' || bonusStarState === 'showing') return;
    setBonusStarNotice(null);
    void rewardedAdsService.show('bonusStar').then(() => {
      const state = rewardedAdsService.stateOf('bonusStar');
      if (state === 'rewarded') {
        engine.applyBonusStar();
        return;
      }
      // The contract is kept if the network/loader fails. Closing an ad
      // early reaches `closedWithoutReward`, which is intentionally not in
      // this branch.
      if (state === 'error' || state === 'unavailable') {
        const before = engine.levelResult?.stars;
        engine.applyBonusStar();
        const after = engine.levelResult?.stars;
        if (before != null && after != null && after > before) {
          onBonusStarFallbackGranted?.(state);
          setBonusStarNotice('Реклама сейчас недоступна — дарим звезду.');
        }
      }
    });
  };

  /** Starts the doubling ad. Unlike the bonus star there is no free
   * fallback: a bonus star restores a result the player very nearly had,
   * while doubling is pure extra — handing it out when the network is down
   * would make the ad pointless. The player is told instead. */
  const requestDailyDouble = () => {
    if (!rewardedAdsService) return;
    if (dailyDoubleState === 'loading' || dailyDoubleState === 'showing') return;
    setBonusStarNotice(null);
    void rewardedAdsService.show('dailyDouble').then(() => {
      const state = rewardedAdsService.stateOf('dailyDouble');
      const stars = engine.levelResult?.stars ?? 0;
      if (state === 'rewarded' && stars > 0) {
        setDailyDoubleGranted(true);
        setBonusStarNotice(`Звёзды удвоены: +${stars}★ в копилку.`);
        onDailyStarsDoubled?.(stars);
        return;
      }
      if (state === 'error' || state === 'unavailable') {
        setBonusStarNotice('Реклама сейчас недоступна — попробуйте позже.');
      }
    });
  };

  useEffect(() => {
    if (snapshot.beams.length === 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const elapsed = (time - start) / 1150;
      setBeamPhase(elapsed % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [snapshot.beams.length]);

  // The daily challenge overrides `engine.level` but leaves `levelIndex`
  // pointing at whatever campaign level the player was on, so a newcomer
  // sitting on level 1 got the tutorial coachmark — an arrow aimed at a
  // square from a different puzzle — drawn over today's board. Mobile has
  // excluded the daily challenge here all along; this is the guard the port
  // dropped.
  const showOnboarding =
    !engine.isDailyChallenge &&
    engine.levelIndex < FIRST_SCORED_LEVEL_INDEX &&
    !seenOnboardingLevels.has(engine.levelIndex);
  const viewport = useViewportSize();
  const skin = useCosmeticSkin();
  const isLandscape = viewport.width > viewport.height;

  const renderOverlays = (layout?: CoachmarkLayout) => (
    <>
      {showOnboarding && <TutorialCoachmark snapshot={snapshot} layout={layout} />}
      {skipOfferOpen && (
        <SkipOfferDialog onSkip={watchAdForSkip} onClose={() => setSkipOfferOpen(false)} />
      )}
      {hintOfferOpen && (
        <HintOfferDialog
          waitMs={hintWait}
          adReady={rewardedAdsService != null && extraHintState !== 'unavailable'}
          adLoading={extraHintState === 'loading' || extraHintState === 'showing'}
          adFailed={extraHintState === 'error'}
          onWatch={watchAdForHint}
          onClose={() => setHintOfferOpen(false)}
        />
      )}
      {snapshot.solved && engine.levelResult && (
        <LevelResultOverlay
          key={`level-result-${engine.levelIndex}`}
          result={engine.levelResult}
          onContinue={onNextLevel}
          onRetry={() => engine.resetLevel()}
          bonusStarOffered={bonusStarOffered || dailyDoubleOffered}
          bonusStarEnabled={
            dailyDoubleOffered
              ? dailyDoubleState !== 'loading' && dailyDoubleState !== 'showing'
              : bonusStarOffered &&
                bonusStarState !== 'loading' &&
                bonusStarState !== 'showing'
          }
          bonusStarNotice={bonusStarNotice}
          onBonusStarRequested={dailyDoubleOffered ? requestDailyDouble : requestBonusStar}
          doublesDailyStars={dailyDoubleOffered}
          achievement={achievement}
          onAchievementRevealed={onAchievementRevealed}
        />
      )}
      {showResetConfirm && (
        <ResetConfirmDialog
          onConfirm={() => {
            engine.resetLevel();
            setShowResetConfirm(false);
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  );

  if (isLandscape) {
    // Landscape-only layout: unlike portrait, this does not use the fixed
    // 430x932 design canvas — it lays the board and tray out directly at
    // the real viewport size. The board is fitted exactly into the gold
    // frame painted into `isometric-table-web-wide.png` (measured once,
    // below), so it can never spill outside the frame or shrink away from
    // it at any viewport size; the tray sits centered underneath, as a
    // horizontal row of pieces — the same arrangement as portrait mode,
    // just without the fixed 430-wide canvas under it.
    const width = viewport.width;
    const height = viewport.height;

    // A cosmetic set without wide art of its own is fitted differently —
    // see `landscapeFallback` below — so this whole measurement of the wide
    // artwork only applies to a set that has it.
    //
    // `isometric-table-web-wide.png` is 1448x1086; its inner gold frame
    // (the blue felt area the board sits on) spans roughly x:[396,1056],
    // y:[330,888] in that image, measured directly from the asset.
    const imageWidth = 1448;
    const imageHeight = 1086;
    const frameFrac = { left: 396 / imageWidth, top: 330 / imageHeight, right: 1056 / imageWidth, bottom: 888 / imageHeight };

    // Replicates `objectFit: contain` to find where the image itself lands
    // inside the viewport, then maps the frame fractions onto that.
    const imageScale = Math.min(width / imageWidth, height / imageHeight);
    const displayedImageWidth = imageWidth * imageScale;
    const displayedImageHeight = imageHeight * imageScale;
    const imageOffsetX = (width - displayedImageWidth) / 2;
    const imageOffsetY = (height - displayedImageHeight) / 2;
    const frameLeft = imageOffsetX + frameFrac.left * displayedImageWidth;
    const frameTop = imageOffsetY + frameFrac.top * displayedImageHeight;
    const frameWidth = (frameFrac.right - frameFrac.left) * displayedImageWidth;
    const frameHeight = (frameFrac.bottom - frameFrac.top) * displayedImageHeight;

    // The board's own aspect ratio doesn't exactly match the frame's, and
    // the frame itself isn't a perfect axis-aligned rectangle (it's painted
    // with the same isometric tilt as the board), so the two axes are fit
    // independently rather than through one shared scale factor: this lets
    // the board stretch almost edge-to-edge left/right (a taller margin
    // would leave a visible gap to the gold rail there) while keeping a
    // slightly larger vertical margin, which is what actually keeps the
    // board's corners clear of the rail top/bottom.
    const boardFitMarginX = 0.985;
    const boardFitMarginY = 0.86;
    const boardScaleX = (frameWidth / BoardPerspective.width) * boardFitMarginX;
    const boardScaleY = (frameHeight / BoardPerspective.height) * boardFitMarginY;
    const boardWidth = BoardPerspective.width * boardScaleX;
    const boardHeight = BoardPerspective.height * boardScaleY;
    const wideBoardLeft = frameLeft + (frameWidth - boardWidth) / 2;
    const wideBoardTop = frameTop + (frameHeight - boardHeight) / 2;

    // Without wide art there is no painted frame to fit into: size the board
    // off the viewport instead, and let the set's portrait table be placed
    // around it (`LandscapeGameBackdrop`) exactly as it is in portrait.
    const fallbackScale = Math.min(
      (height * 0.74) / BoardPerspective.height,
      (width * 0.42) / BoardPerspective.width,
    );
    const landscapeFallback = !skin.wideBoardAsset;
    const finalScaleX = landscapeFallback ? fallbackScale : boardScaleX;
    const finalScaleY = landscapeFallback ? fallbackScale : boardScaleY;
    const boardLeft = landscapeFallback
      ? (width - BoardPerspective.width * finalScaleX) / 2
      : wideBoardLeft;
    const boardTop = landscapeFallback
      ? (height - BoardPerspective.height * finalScaleY) / 2
      : wideBoardTop;

    // Tall enough that the tray's fixed-size piece art (44x70, unscaled —
    // landscape has no outer canvas transform to shrink it) never pokes out
    // of the card's top/bottom edge, and given a real gap below the board so
    // it clears the frame's bottom rail instead of sitting on top of it. On
    // a very short viewport there may not be room for both the full gap and
    // the full tray height below the frame — shrink the gap first, then the
    // tray height itself, rather than ever letting the tray overlap the
    // board.
    const bottomMargin = 14;
    const finalBoardWidth = BoardPerspective.width * finalScaleX;
    const finalBoardHeight = BoardPerspective.height * finalScaleY;
    const availableBelowBoard = height - (boardTop + finalBoardHeight) - bottomMargin;
    let boardToTrayGap = 58;
    let landscapeTrayHeight = 130;
    if (boardToTrayGap + landscapeTrayHeight > availableBelowBoard) {
      boardToTrayGap = Math.max(10, availableBelowBoard - landscapeTrayHeight);
      if (boardToTrayGap + landscapeTrayHeight > availableBelowBoard) {
        landscapeTrayHeight = Math.max(90, availableBelowBoard - boardToTrayGap);
      }
    }
    const trayWidth = Math.min(360, Math.max(220, finalBoardWidth * 0.82));
    const trayLeft = (width - trayWidth) / 2;
    const trayTop = boardTop + finalBoardHeight + boardToTrayGap;
    const trayBottom = Math.max(bottomMargin, height - trayTop - landscapeTrayHeight);

    return (
      <div style={{ position: 'fixed', inset: 0, background: skin.wideBoardAsset ? '#030406' : skin.backdrop, overflow: 'hidden' }}>
        <LandscapeGameBackdrop
          boardLeft={boardLeft}
          boardTop={boardTop}
          boardScaleX={finalScaleX}
          boardScaleY={finalScaleY}
        />
        <TopControls
          onBack={onBack}
          onHint={handleHint}
          hintEnabled
          hintsLeft={gated ? hintsLeft : undefined}
          onCalendar={engine.isDailyChallenge ? onOpenDailyCalendar : undefined}
          dailyStreak={dailyStreak}
        />
        <TopStatus done={snapshot.doneCount} total={snapshot.beacons.length} level={snapshot.levelNumber} label={snapshot.levelLabel} />
        <Board
          engine={engine}
          snapshot={snapshot}
          beamPhase={beamPhase}
          drag={drag}
          boardRef={boardRef}
          boardLeft={boardLeft}
          boardTop={boardTop}
          scale={finalScaleX}
          scaleY={finalScaleY}
        />
        <Tray
          engine={engine}
          snapshot={snapshot}
          drag={drag}
          trayRef={trayRef}
          left={trayLeft}
          right={width - trayLeft - trayWidth}
          bottom={trayBottom}
          height={landscapeTrayHeight}
          vertical={false}
          panelExtent={trayWidth}
        />
        <BottomUtilityControls
          onReset={() => setShowResetConfirm(true)}
          onSkip={onSkipLevel}
          onResetOnboarding={onResetOnboarding}
          showSkip={isDev}
        />
        {renderOverlays({
          isLandscape: true,
          canvasWidth: width,
          board: { left: boardLeft, top: boardTop, scaleX: finalScaleX, scaleY: finalScaleY },
          tray: { left: trayLeft, top: trayTop, width: trayWidth, height: landscapeTrayHeight },
        })}
      </div>
    );
  }

  return (
    <DesignCanvas background="#05091a">
      {(canvas) => (
      <div
        style={{
          position: 'relative',
          width: canvas.width,
          height: canvas.height,
          overflow: 'hidden',
        }}
      >
        <StaticGameBackdrop canvas={canvas} />
        <TopControls
          onBack={onBack}
          onHint={handleHint}
          hintEnabled
          hintsLeft={gated ? hintsLeft : undefined}
          onCalendar={engine.isDailyChallenge ? onOpenDailyCalendar : undefined}
          dailyStreak={dailyStreak}
        />
        <TopStatus done={snapshot.doneCount} total={snapshot.beacons.length} level={snapshot.levelNumber} label={snapshot.levelLabel} />
        <Board
          engine={engine}
          snapshot={snapshot}
          beamPhase={beamPhase}
          drag={drag}
          boardRef={boardRef}
          // Centred rather than fixed at 34 units: on a wider canvas that
          // constant would leave the board against the left edge.
          boardLeft={(canvas.width - BoardPerspective.width) / 2}
        />
        <Tray
          engine={engine}
          snapshot={snapshot}
          drag={drag}
          trayRef={trayRef}
          // The panel keeps the width it was drawn at and stays centred: a
          // tray stretched across a tablet is a strip of empty blue with
          // four tiles in the middle of it.
          left={trayPortraitInset(canvas.width)}
          right={trayPortraitInset(canvas.width)}
        />
        <BottomUtilityControls
          onReset={() => setShowResetConfirm(true)}
          onSkip={onSkipLevel}
          onResetOnboarding={onResetOnboarding}
          showSkip={isDev}
        />
        {renderOverlays(portraitCoachmarkLayout(canvas))}
      </div>
      )}
    </DesignCanvas>
  );
}

/** A set without wide art of its own gets its portrait table placed here:
 * scaled and offset so the frame stands around the smaller landscape board
 * exactly as it does in portrait, with its edges faded into the set's own
 * darkness so the art does not end in four straight cuts. */
function LandscapeGameBackdrop({
  boardLeft,
  boardTop,
  boardScaleX,
  boardScaleY,
}: {
  boardLeft: number;
  boardTop: number;
  boardScaleX: number;
  boardScaleY: number;
}) {
  const skin = useCosmeticSkin();
  if (skin.wideBoardAsset) {
    return (
      <img
        // The same painting at twice the resolution: measured, its felt sits
      // at the same fractions the frame maths below is written against.
      src={skin.adaptiveBoard.ultrawide}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        draggable={false}
      />
    );
  }
  const fade =
    'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent),' +
    'linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent)';
  return (
    <img
      src={skin.boardAsset}
      alt=""
      style={{
        position: 'absolute',
        left: boardLeft - BOARD_LEFT * boardScaleX,
        top: boardTop - BOARD_TOP * boardScaleY,
        width: 430 * boardScaleX,
        height: 764 * boardScaleY,
        objectFit: 'fill',
        maskImage: fade,
        WebkitMaskImage: fade,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }}
      draggable={false}
    />
  );
}

function StaticGameBackdrop({ canvas }: { canvas: CanvasSize }) {
  const skin = useCosmeticSkin();
  // The room painted for this shape of canvas: its middle 430 units are the
  // picture the board's frame is drawn into, so the frame lands on the
  // playable cells whichever version is showing.
  const artWidth = canvas.width > 430.5 ? Math.max(canvas.width, 940) : 430;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: skin.backdrop }} />
      <img
        src={artForCanvas(skin.adaptiveBoard, canvas)}
        alt=""
        style={{
          position: 'absolute',
          left: (canvas.width - artWidth) / 2,
          top: 0,
          width: artWidth,
          height: canvas.height,
          objectFit: 'fill',
        }}
        draggable={false}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 230,
          pointerEvents: 'none',
          background:
            'linear-gradient(to bottom, rgba(9,14,34,0.9), rgba(6,10,24,0.6), rgba(2,5,13,0.33), transparent)',
        }}
      />
    </>
  );
}
