import { DesignCanvas } from '../components/shared/DesignCanvas';
import { artForCanvas } from '../game/cosmeticSkins';
import { LevelSelectList } from '../components/game/LevelSelectList';
import { RoundControl } from '../components/shared/RoundControl';
import { useViewportSize } from '../components/game/useViewportSize';
import type { GameProgress } from '../game/gameProgress';
import { useCosmeticSkin } from '../game/cosmeticSkinContext';

interface LevelSelectProps {
  unlockedLevels: Set<number>;
  highestUnlocked: number;
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  progress: GameProgress;
  onBack: () => void;
  onLevelChosen: (index: number) => void;
}
export function LevelSelectScreen(props: LevelSelectProps) {
  const viewport = useViewportSize();
  const skin = useCosmeticSkin();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeLevelSelectScene {...props} viewportWidth={viewport.width} />;
  }

  const { unlockedLevels, highestUnlocked, tutorialComplete, levelStars, progress, onBack, onLevelChosen } =
    props;
  return (
    <DesignCanvas>
      {(canvas) => {
        // More tiles side by side, never bigger ones: a level tile is a tap
        // target at the size it was drawn. The panel takes what width it can
        // and fits whole tiles into it at their own pitch.
        const tilePitch = 113;
        const panelPadding = 32;
        const columns = Math.min(
          6,
          Math.max(3, Math.floor((canvas.width - 92 - panelPadding + 16) / tilePitch)),
        );
        const panelWidth = columns * tilePitch - 16 + panelPadding;
        const panelInset = Math.max(46, (canvas.width - panelWidth) / 2);
        return (
      <div
        style={{
          position: 'relative',
          width: canvas.width,
          height: canvas.height,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
        {/* The room the menu is set in, carried behind the list: this screen
            opens over the menu and used to drop it for flat black. */}
        <img
          src={artForCanvas(skin.adaptiveMenu, canvas)}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          draggable={false}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            background: 'linear-gradient(to bottom, #000, transparent)',
          }}
        />
        <div style={{ position: 'absolute', top: 22, left: 20 }}>
          <RoundControl onClick={onBack} label="Назад в меню">
            ‹
          </RoundControl>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 98,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            color: 'var(--gold-bright)',
            fontSize: 25,
            fontWeight: 900,
            letterSpacing: 3.5,
            textShadow: '0 3px 5px rgba(0,0,0,0.8)',
          }}
        >
          УРОВНИ
        </div>
        <div
          style={{
            position: 'absolute',
            top: 144,
            left: panelInset,
            right: panelInset,
            bottom: 72,
            borderRadius: 14,
            background: 'rgba(11,23,51,0.9)',
            border: '1.5px solid rgba(216,165,55,0.85)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
            padding: '16px 0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <LevelSelectList
            unlockedLevels={unlockedLevels}
            highestUnlocked={highestUnlocked}
            tutorialComplete={tutorialComplete}
            levelStars={levelStars}
            progress={progress}
            onLevelChosen={onLevelChosen}
            columns={columns}
            gutter={16}
          />
        </div>
      </div>
        );
      }}
    </DesignCanvas>
  );
}

/**
 * Wide-screen level selection uses the available horizontal space for the
 * cards instead of shrinking the portrait 430x932 canvas into the centre.
 */
function LandscapeLevelSelectScene({
  unlockedLevels,
  highestUnlocked,
  tutorialComplete,
  levelStars,
  progress,
  onBack,
  onLevelChosen,
  viewportWidth,
}: LevelSelectProps & { viewportWidth: number }) {
  const skin = useCosmeticSkin();
  // Each tile remains comfortably tappable while the number of columns grows
  // on tablets and desktop-sized browser windows.
  const columns = Math.min(8, Math.max(5, Math.floor((viewportWidth - 112) / 108)));

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={skin.adaptiveMenu.ultrawide}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.71)' }} />
      <div style={{ position: 'absolute', top: 22, left: 20 }}>
        <RoundControl onClick={onBack} label="Назад в меню">
          ‹
        </RoundControl>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 96,
          right: 96,
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          color: 'var(--gold-bright)',
          fontSize: 25,
          fontWeight: 900,
          letterSpacing: 3.5,
          textShadow: '0 3px 5px rgba(0,0,0,0.8)',
        }}
      >
        УРОВНИ
      </div>
      <div
        style={{
          position: 'absolute',
          top: 82,
          left: 52,
          right: 52,
          bottom: 16,
          borderRadius: 14,
          background: 'rgba(11,23,51,0.91)',
          border: '1.5px solid rgba(216,165,55,0.85)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
          padding: '10px 0 14px 18px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LevelSelectList
          unlockedLevels={unlockedLevels}
          highestUnlocked={highestUnlocked}
          tutorialComplete={tutorialComplete}
          levelStars={levelStars}
          progress={progress}
          onLevelChosen={onLevelChosen}
          columns={columns}
          aspectRatio={1.32}
          gutter={18}
        />
      </div>
    </div>
  );
}
