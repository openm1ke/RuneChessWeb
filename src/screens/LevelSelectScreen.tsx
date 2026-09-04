import { DesignCanvas } from '../components/shared/DesignCanvas';
import { MiniStarRow } from '../components/shared/StarRow';
import { RoundControl } from '../components/shared/RoundControl';
import { FIRST_SCORED_LEVEL_INDEX, MAIN_CAMPAIGN_LEVEL_COUNT, campaignLevels } from '../data/campaignLevels';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';

/** One scrollable section of the level list — a full campaign or the
 * tutorial. Shared between the portrait and landscape layouts below so a
 * future campaign only needs one new entry here, not a duplicated
 * `SectionTitle`+`LevelGrid` pair in each layout. */
function campaignSections(tutorialComplete: boolean): { label: string; start: number; count: number; locked: boolean }[] {
  return [
    { label: 'ОБУЧЕНИЕ · 5 УРОВНЕЙ', start: 0, count: FIRST_SCORED_LEVEL_INDEX, locked: false },
    {
      label: tutorialComplete ? 'ОСНОВНАЯ КАМПАНИЯ' : 'ОСНОВНАЯ КАМПАНИЯ · ПРОЙДИТЕ ОБУЧЕНИЕ',
      start: FIRST_SCORED_LEVEL_INDEX,
      count: MAIN_CAMPAIGN_LEVEL_COUNT - FIRST_SCORED_LEVEL_INDEX,
      locked: !tutorialComplete,
    },
    {
      label: 'НОВАЯ КАМПАНИЯ · ПОЛЕ 7×7',
      start: MAIN_CAMPAIGN_LEVEL_COUNT,
      count: campaignLevels.length - MAIN_CAMPAIGN_LEVEL_COUNT,
      // Not gated by a section-wide `locked` flag on mobile either — each
      // tile's own unlock state (from `unlockedLevels`) already governs
      // whether it's reachable, exactly like every other level boundary.
      locked: false,
    },
  ];
}

interface LevelSelectProps {
  unlockedLevels: Set<number>;
  highestUnlocked: number;
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  onBack: () => void;
  onLevelChosen: (index: number) => void;
}

export function LevelSelectScreen(props: LevelSelectProps) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeLevelSelectScene {...props} viewportWidth={viewport.width} />;
  }

  const { unlockedLevels, highestUnlocked, tutorialComplete, levelStars, onBack, onLevelChosen } = props;
  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        {/* Plain black, matching the current Flutter screen — it dropped its
            castle background image (menu-castle-bg-v4.png was removed from
            the project and never replaced here; the menu/settings/tutorial
            screens keep their own -clean.png background). */}
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
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
          className="dozor-scroll-panel"
          style={{
            position: 'absolute',
            top: 144,
            left: 46,
            right: 46,
            bottom: 72,
            borderRadius: 14,
            background: 'rgba(11,23,51,0.9)',
            border: '1.5px solid rgba(216,165,55,0.85)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          {campaignSections(tutorialComplete).map((section) => (
            <div key={section.start}>
              <SectionTitle label={section.label} locked={section.locked} />
              <LevelGrid
                start={section.start}
                count={section.count}
                unlockedLevels={unlockedLevels}
                highestUnlocked={highestUnlocked}
                locked={section.locked}
                levelStars={levelStars}
                onLevelChosen={onLevelChosen}
              />
            </div>
          ))}
        </div>
      </div>
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
  onBack,
  onLevelChosen,
  viewportWidth,
}: LevelSelectProps & { viewportWidth: number }) {
  // Each tile remains comfortably tappable while the number of columns grows
  // on tablets and desktop-sized browser windows.
  const columns = Math.min(8, Math.max(5, Math.floor((viewportWidth - 112) / 108)));

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={asset("assets/images/menu-castle-bg-web-wide.webp")}
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
        className="dozor-scroll-panel"
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
          padding: '10px 18px 14px',
          overflowY: 'auto',
        }}
      >
        {campaignSections(tutorialComplete).map((section) => (
          <div key={section.start}>
            <SectionTitle label={section.label} locked={section.locked} />
            <LevelGrid
              start={section.start}
              count={section.count}
              unlockedLevels={unlockedLevels}
              highestUnlocked={highestUnlocked}
              locked={section.locked}
              levelStars={levelStars}
              onLevelChosen={onLevelChosen}
              columns={columns}
              aspectRatio={1.32}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ label, locked = false }: { label: string; locked?: boolean }) {
  return (
    <div
      style={{
        padding: '6px 4px 10px',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.35,
        color: locked ? 'rgba(122,135,159,0.5)' : 'var(--gold)',
      }}
    >
      {label}
    </div>
  );
}

function LevelGrid({
  start,
  count,
  unlockedLevels,
  highestUnlocked,
  onLevelChosen,
  locked = false,
  levelStars = new Map(),
  columns = 3,
  aspectRatio = 1,
}: {
  start: number;
  count: number;
  unlockedLevels: Set<number>;
  highestUnlocked: number;
  onLevelChosen: (index: number) => void;
  locked?: boolean;
  levelStars?: Map<number, number>;
  columns?: number;
  aspectRatio?: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        marginBottom: 12,
      }}
    >
      {Array.from({ length: count }, (_, localIndex) => {
        const index = start + localIndex;
        const unlocked = !locked && unlockedLevels.has(index);
        // `highestUnlocked` is the frontier index unlocked by finishing its
        // predecessor, so `index < highestUnlocked` normally means "this
        // level has been surpassed" — completed. But the very last campaign
        // level has no successor to unlock, so that frontier never advances
        // past it; falling back to a recorded star result catches that case
        // without depending on the frontier.
        const completed = unlocked && (index < highestUnlocked || levelStars.get(index) != null);
        return (
          <LevelTile
            key={index}
            level={index + 1}
            unlocked={unlocked}
            completed={completed}
            stars={levelStars.get(index)}
            onClick={() => onLevelChosen(index)}
            aspectRatio={aspectRatio}
          />
        );
      })}
    </div>
  );
}

function LevelTile({
  level,
  unlocked,
  completed,
  stars,
  onClick,
  aspectRatio = 1,
}: {
  level: number;
  unlocked: boolean;
  completed: boolean;
  stars?: number;
  onClick: () => void;
  aspectRatio?: number;
}) {
  const border = unlocked ? '#d8a537' : 'rgba(92,102,125,0.38)';
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onClick}
      aria-label={unlocked ? `Уровень ${level}` : `Уровень ${level} заблокирован`}
      style={{
        aspectRatio: String(aspectRatio),
        borderRadius: 16,
        border: `1.4px solid ${border}`,
        background: unlocked ? 'rgba(20,40,84,0.95)' : 'rgba(10,16,34,0.83)',
        boxShadow: completed ? '0 0 10px rgba(40,217,163,0.27)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: unlocked ? 'pointer' : 'default',
        color: unlocked ? 'var(--gold-bright)' : 'rgba(109,119,144,0.44)',
      }}
    >
      <span style={{ fontSize: 27, fontWeight: 900 }}>{level}</span>
      {stars != null && stars > 0 && (
        <div style={{ marginTop: 3 }}>
          <MiniStarRow stars={stars} />
        </div>
      )}
      <span
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          fontSize: 14,
          color: completed ? '#40d6a2' : unlocked ? 'var(--gold)' : 'rgba(109,119,144,0.44)',
        }}
      >
        {completed ? '✓' : unlocked ? '▶' : '🔒'}
      </span>
    </button>
  );
}
