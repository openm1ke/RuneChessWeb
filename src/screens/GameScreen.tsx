import { useEffect, useRef, useState } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { Board } from '../components/board/Board';
import { BoardPerspective } from '../components/board/boardPerspective';
import { Tray } from '../components/tray/Tray';
import { useDragController } from '../components/board/useDragController';
import { useViewportSize } from '../components/game/useViewportSize';
import { TopControls, TopStatus, BottomUtilityControls } from '../components/game/TopBar';
import { ResetConfirmDialog } from '../components/game/ResetConfirmDialog';
import { LevelResultOverlay } from '../components/game/LevelResultOverlay';
import { TutorialCoachmark, type CoachmarkLayout } from '../components/game/TutorialCoachmark';
import { useDozorEngine } from '../game/useDozorEngine';
import { FIRST_SCORED_LEVEL_INDEX, type DozorEngine } from '../game/dozorEngine';
import { asset } from '../lib/assetUrl';
import type { RewardedAdsService, RewardedAdState } from '../services/rewardedAdsService';

const isDev = import.meta.env.DEV;

export function GameScreen({
  engine,
  onBack,
  onNextLevel,
  onSkipLevel,
  onResetOnboarding,
  seenOnboardingLevels,
  rewardedAdsService,
}: {
  engine: DozorEngine;
  onBack: () => void;
  onNextLevel: () => void;
  onSkipLevel?: () => void;
  onResetOnboarding?: () => void;
  seenOnboardingLevels: Set<number>;
  rewardedAdsService?: RewardedAdsService;
}) {
  const { snapshot } = useDozorEngine(engine);
  const boardRef = useRef<HTMLDivElement>(null!);
  const trayRef = useRef<HTMLDivElement>(null!);
  const drag = useDragController(engine, boardRef, trayRef);
  const [beamPhase, setBeamPhase] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [extraHintState, setExtraHintState] = useState<RewardedAdState>('idle');
  const [bonusStarState, setBonusStarState] = useState<RewardedAdState>('idle');

  useEffect(() => {
    if (!rewardedAdsService) return;
    setExtraHintState(rewardedAdsService.stateOf('extraHint'));
    setBonusStarState(rewardedAdsService.stateOf('bonusStar'));
    return rewardedAdsService.addListener((placement, state) => {
      if (placement === 'extraHint') setExtraHintState(state);
      else setBonusStarState(state);
    });
  }, [rewardedAdsService]);

  const onCampaignLevel = engine.levelIndex >= FIRST_SCORED_LEVEL_INDEX;

  // On tutorial levels the hint stays a free toggle; on campaign levels
  // every hint is requested via a rewarded ad and only ever turns on
  // (never off) — see `DozorEngine.grantHint`. The button itself is
  // disabled while a show is already in flight, guarding a fast double-tap
  // the same way the mobile app's `_hintButtonEnabled` does.
  const hintEnabled = !onCampaignLevel || !rewardedAdsService || extraHintState !== 'loading';
  const handleHint = () => {
    if (!onCampaignLevel || !rewardedAdsService) {
      engine.toggleHint();
      return;
    }
    if (extraHintState === 'loading') return;
    void rewardedAdsService.show('extraHint').then(() => {
      if (rewardedAdsService.stateOf('extraHint') === 'rewarded') engine.grantHint();
    });
  };

  const bonusStarOffered =
    rewardedAdsService != null &&
    snapshot.solved &&
    engine.levelResult?.stars != null &&
    engine.levelResult.stars < 3 &&
    engine.hintUsedCount === 0;
  const requestBonusStar = () => {
    if (!rewardedAdsService || bonusStarState === 'loading') return;
    void rewardedAdsService.show('bonusStar').then(() => {
      if (rewardedAdsService.stateOf('bonusStar') === 'rewarded') engine.applyBonusStar();
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

  const showOnboarding =
    engine.levelIndex < FIRST_SCORED_LEVEL_INDEX && !seenOnboardingLevels.has(engine.levelIndex);
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  const renderOverlays = (layout?: CoachmarkLayout) => (
    <>
      {showOnboarding && <TutorialCoachmark snapshot={snapshot} layout={layout} />}
      {snapshot.solved && engine.levelResult && (
        <LevelResultOverlay
          key={`level-result-${engine.levelIndex}`}
          result={engine.levelResult}
          onContinue={onNextLevel}
          onRetry={() => engine.resetLevel()}
          bonusStarOffered={bonusStarOffered}
          bonusStarEnabled={bonusStarOffered && bonusStarState !== 'loading'}
          onBonusStarRequested={requestBonusStar}
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
    const boardLeft = frameLeft + (frameWidth - boardWidth) / 2;
    const boardTop = frameTop + (frameHeight - boardHeight) / 2;

    // Tall enough that the tray's fixed-size piece art (44x70, unscaled —
    // landscape has no outer canvas transform to shrink it) never pokes out
    // of the card's top/bottom edge, and given a real gap below the board so
    // it clears the frame's bottom rail instead of sitting on top of it. On
    // a very short viewport there may not be room for both the full gap and
    // the full tray height below the frame — shrink the gap first, then the
    // tray height itself, rather than ever letting the tray overlap the
    // board.
    const bottomMargin = 14;
    const availableBelowBoard = height - (boardTop + boardHeight) - bottomMargin;
    let boardToTrayGap = 58;
    let landscapeTrayHeight = 130;
    if (boardToTrayGap + landscapeTrayHeight > availableBelowBoard) {
      boardToTrayGap = Math.max(10, availableBelowBoard - landscapeTrayHeight);
      if (boardToTrayGap + landscapeTrayHeight > availableBelowBoard) {
        landscapeTrayHeight = Math.max(90, availableBelowBoard - boardToTrayGap);
      }
    }
    const trayWidth = Math.min(360, Math.max(220, boardWidth * 0.82));
    const trayLeft = (width - trayWidth) / 2;
    const trayTop = boardTop + boardHeight + boardToTrayGap;
    const trayBottom = Math.max(bottomMargin, height - trayTop - landscapeTrayHeight);

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#030406', overflow: 'hidden' }}>
        <LandscapeGameBackdrop />
        <TopControls onBack={onBack} onHint={handleHint} hintEnabled={hintEnabled} />
        <TopStatus done={snapshot.doneCount} total={snapshot.beacons.length} level={snapshot.levelNumber} />
        <Board
          engine={engine}
          snapshot={snapshot}
          beamPhase={beamPhase}
          drag={drag}
          boardRef={boardRef}
          boardLeft={boardLeft}
          boardTop={boardTop}
          scale={boardScaleX}
          scaleY={boardScaleY}
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
          board: { left: boardLeft, top: boardTop, scaleX: boardScaleX, scaleY: boardScaleY },
          tray: { left: trayLeft, top: trayTop, width: trayWidth, height: landscapeTrayHeight },
        })}
      </div>
    );
  }

  return (
    <DesignCanvas background="#05091a">
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        <StaticGameBackdrop />
        <TopControls onBack={onBack} onHint={handleHint} hintEnabled={hintEnabled} />
        <TopStatus done={snapshot.doneCount} total={snapshot.beacons.length} level={snapshot.levelNumber} />
        <Board engine={engine} snapshot={snapshot} beamPhase={beamPhase} drag={drag} boardRef={boardRef} />
        <Tray engine={engine} snapshot={snapshot} drag={drag} trayRef={trayRef} />
        <BottomUtilityControls
          onReset={() => setShowResetConfirm(true)}
          onSkip={onSkipLevel}
          onResetOnboarding={onResetOnboarding}
          showSkip={isDev}
        />
        {renderOverlays()}
      </div>
    </DesignCanvas>
  );
}

function LandscapeGameBackdrop() {
  return (
    <img
      src={asset("assets/images/isometric-table-web-wide.webp")}
      alt=""
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      draggable={false}
    />
  );
}

function StaticGameBackdrop() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#05091a' }} />
      <img
        src={asset("assets/images/isometric-table.webp")}
        alt=""
        style={{ position: 'absolute', left: 0, top: 0, width: 430, height: 764, objectFit: 'fill' }}
        draggable={false}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 764,
          bottom: 0,
          background: 'linear-gradient(to bottom, #160b08, #03050d)',
        }}
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
