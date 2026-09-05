import { useLayoutEffect, useRef } from 'react';
import { MiniStarRow } from '../shared/StarRow';
import { ProgressSummary } from '../shared/ProgressSummary';
import {
  FIRST_SCORED_LEVEL_INDEX,
  MAIN_CAMPAIGN_LEVEL_COUNT,
  campaignLevels,
} from '../../data/campaignLevels';
import type { GameProgress } from '../../game/gameProgress';

/**
 * The scrolling body of the level screen, shared by both layouts so the
 * portrait and landscape versions can never drift apart. Mirrors the mobile
 * `LevelSelectList`.
 *
 * Three things here are deliberate and worth not undoing:
 *
 * - Locked levels are only drawn a row past the frontier, with the rest
 *   summarised in one strip. A campaign of 165 levels rendered in full is a
 *   wall of padlocks: not clickable, carrying no information, and burying the
 *   handful of tiles the player can actually use.
 * - The list opens on the level the player is about to play rather than at
 *   the top. Nobody comes here to read level 1 again.
 * - The progress line sits outside the scroller, because that auto-scroll
 *   would otherwise carry it off the top before it was ever read.
 */
const LOCKED_ROWS_AHEAD = 1;

export function LevelSelectList({
  unlockedLevels,
  highestUnlocked,
  tutorialComplete,
  levelStars,
  progress,
  onLevelChosen,
  columns,
  aspectRatio = 1,
}: {
  unlockedLevels: Set<number>;
  highestUnlocked: number;
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  progress: GameProgress;
  onLevelChosen: (index: number) => void;
  columns: number;
  aspectRatio?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentTileRef = useRef<HTMLButtonElement>(null);
  const openedAtCurrentLevel = useRef(false);

  // Before paint, so the list is never seen at the top first. Unlike the
  // mobile app this can measure the real tile instead of computing an offset:
  // the DOM is laid out by the time a layout effect runs.
  useLayoutEffect(() => {
    if (openedAtCurrentLevel.current) return;
    const scroller = scrollerRef.current;
    const tile = currentTileRef.current;
    if (!scroller || !tile) return;
    openedAtCurrentLevel.current = true;
    scroller.scrollTop = Math.max(
      0,
      tile.offsetTop - scroller.clientHeight * 0.3,
    );
  }, []);

  const mainStart = FIRST_SCORED_LEVEL_INDEX;
  const mainCount = MAIN_CAMPAIGN_LEVEL_COUNT - FIRST_SCORED_LEVEL_INDEX;
  const bonusStart = MAIN_CAMPAIGN_LEVEL_COUNT;
  const bonusCount = campaignLevels.length - MAIN_CAMPAIGN_LEVEL_COUNT;

  const isCompleted = (index: number) =>
    unlockedLevels.has(index) &&
    (index < highestUnlocked || levelStars.get(index) != null);

  const completedIn = (start: number, count: number) => {
    let done = 0;
    for (let i = start; i < start + count; i++) if (isCompleted(i)) done++;
    return done;
  };

  /** Tiles to draw for a section: everything up to and including the row
   * holding the frontier, plus one more row of what is coming. */
  const visibleCount = (start: number, count: number, locked: boolean) => {
    if (locked) return Math.min(count, columns);
    let lastUnlocked = -1;
    for (let i = count - 1; i >= 0; i--) {
      if (unlockedLevels.has(start + i)) {
        lastUnlocked = i;
        break;
      }
    }
    const rows = Math.ceil((lastUnlocked + 1) / columns) + LOCKED_ROWS_AHEAD;
    return Math.min(count, rows * columns);
  };

  const mainVisible = visibleCount(mainStart, mainCount, !tutorialComplete);
  const bonusVisible = visibleCount(
    bonusStart,
    bonusCount,
    highestUnlocked < MAIN_CAMPAIGN_LEVEL_COUNT,
  );

  const tile = (index: number, scored: boolean, locked = false) => {
    const unlocked = !locked && unlockedLevels.has(index);
    return (
      <LevelTile
        key={index}
        ref={index === highestUnlocked ? currentTileRef : undefined}
        level={index + 1}
        unlocked={unlocked}
        completed={unlocked && isCompleted(index)}
        isCurrent={index === highestUnlocked}
        scored={scored}
        stars={levelStars.get(index)}
        aspectRatio={aspectRatio}
        onClick={() => onLevelChosen(index)}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ProgressSummary progress={progress} compact />
      <div style={{ height: 12 }} />
      <div ref={scrollerRef} className="dozor-scroll-panel" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <SectionTitle label="ОБУЧЕНИЕ · 5 УРОВНЕЙ" />
        {/* A centred wrap rather than a grid: five tiles across three columns
            leaves a hole on the right, and centring the short last row reads
            as a deliberate end to the section instead. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {Array.from({ length: FIRST_SCORED_LEVEL_INDEX }, (_, i) => (
            <div
              key={i}
              style={{ width: `calc((100% - ${12 * (columns - 1)}px) / ${columns})` }}
            >
              {tile(i, false)}
            </div>
          ))}
        </div>
        <SectionTitle
          label={
            tutorialComplete
              ? `ОСНОВНАЯ КАМПАНИЯ · ${completedIn(mainStart, mainCount)} ИЗ ${mainCount}`
              : 'ОСНОВНАЯ КАМПАНИЯ · ПРОЙДИТЕ ОБУЧЕНИЕ'
          }
          locked={!tutorialComplete}
        />
        <LevelGrid columns={columns}>
          {Array.from({ length: mainVisible }, (_, i) =>
            tile(mainStart + i, true, !tutorialComplete),
          )}
        </LevelGrid>
        {mainVisible < mainCount && <MoreLevelsStrip remaining={mainCount - mainVisible} />}
        <SectionTitle
          label={`НОВАЯ КАМПАНИЯ · ПОЛЕ 7×7 · ${completedIn(bonusStart, bonusCount)} ИЗ ${bonusCount}`}
        />
        <LevelGrid columns={columns}>
          {Array.from({ length: bonusVisible }, (_, i) => tile(bonusStart + i, true))}
        </LevelGrid>
        {bonusVisible < bonusCount && <MoreLevelsStrip remaining={bonusCount - bonusVisible} />}
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

function LevelGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

/** Stands in for every locked level past the horizon — see this module's
 * doc comment for why they are not all drawn. */
function MoreLevelsStrip({ remaining }: { remaining: number }) {
  return (
    <div
      style={{
        marginTop: 12,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        background: 'rgba(10,16,34,0.2)',
        border: '1px solid rgba(92,102,125,0.24)',
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.4,
        color: 'rgba(174,187,214,0.56)',
      }}
    >
      {`Ещё ${remaining} ${levelWord(remaining)} впереди`}
    </div>
  );
}

function levelWord(count: number): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'уровней';
  switch (count % 10) {
    case 1:
      return 'уровень';
    case 2:
    case 3:
    case 4:
      return 'уровня';
    default:
      return 'уровней';
  }
}

function LevelTile({
  ref,
  level,
  unlocked,
  completed,
  isCurrent,
  scored,
  stars,
  aspectRatio,
  onClick,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  level: number;
  unlocked: boolean;
  completed: boolean;
  /** The frontier level — the one the player is about to play. This screen
   * exists mostly to get back to it, so it is the one tile allowed to draw
   * attention to itself. */
  isCurrent: boolean;
  /** Whether this level earns stars at all. Scored tiles always reserve the
   * star row — muted when nothing is earned yet — so numbers stay aligned
   * across a row instead of shifting with whatever each tile happens to
   * have. The five tutorial levels are unscored and use a tick instead. */
  scored: boolean;
  stars?: number;
  aspectRatio: number;
  onClick: () => void;
}) {
  const border = isCurrent ? 'var(--gold)' : unlocked ? '#d8a537' : 'rgba(92,102,125,0.38)';
  // The corner badge says what can be done here, not what already happened:
  // a finished scored level is described by its stars, so stacking a tick on
  // top only added a second status colour competing with them.
  const badge = !unlocked ? '🔒' : completed ? (scored ? null : '✓') : '▶';
  return (
    <button
      ref={ref}
      type="button"
      disabled={!unlocked}
      onClick={onClick}
      aria-label={unlocked ? `Уровень ${level}` : `Уровень ${level} заблокирован`}
      style={{
        width: '100%',
        aspectRatio: String(aspectRatio),
        borderRadius: 16,
        border: `${isCurrent ? 2.2 : 1.4}px solid ${border}`,
        background: unlocked ? 'rgba(20,40,84,0.95)' : 'rgba(10,16,34,0.83)',
        // Only the level about to be played glows. A completed level is
        // already described by its stars, and lighting up dozens of them
        // buried the one tile that matters.
        boxShadow: isCurrent ? '0 0 14px rgba(255,215,121,0.35)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: unlocked ? 'pointer' : 'default',
        color: unlocked ? 'var(--gold-bright)' : 'rgba(109,119,144,0.44)',
      }}
    >
      <span style={{ fontSize: 27, fontWeight: 900, lineHeight: 1 }}>{level}</span>
      {scored && (
        <div style={{ marginTop: 3, height: 9 }}>
          {/* A locked level keeps the row's height so numbers stay aligned
              with its unlocked neighbours, but not its stars: three muted
              stars on something that cannot be played yet is noise
              pretending to be progress. */}
          {unlocked && <MiniStarRow stars={stars ?? 0} />}
        </div>
      )}
      {badge && (
        <span
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            fontSize: 14,
            color: unlocked ? 'var(--gold)' : 'rgba(109,119,144,0.44)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
