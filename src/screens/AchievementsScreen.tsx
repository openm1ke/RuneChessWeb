import { useState, type ReactNode } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { RoundControl } from '../components/shared/RoundControl';
import { AchievementReveal } from '../components/shared/AchievementReveal';
import { useViewportSize } from '../components/game/useViewportSize';
import {
  allAchievements,
  progressCountFor,
  progressFraction,
  progressLabel,
  unlockedIds,
  type AchievementDefinition,
  type AchievementProgressCount,
} from '../data/achievements';
import { ProgressSummary } from '../components/shared/ProgressSummary';
import type { GameProgress } from '../game/gameProgress';
import type { AchievementProgressState } from '../game/achievementProgress';
import { asset } from '../lib/assetUrl';

interface AchievementsProps {
  /** Shared with the level list so both screens quote the same numbers —
   * this panel used to count only three-star levels while calling them
   * "пройдено". See `GameProgress`. */
  progress: GameProgress;
  tutorialComplete: boolean;
  levelStars: Map<number, number>;
  achievementProgress: AchievementProgressState;
  achievementUnlockedAt: Map<string, string>;
  onBack: () => void;
  onAchievementViewed?: (achievementId: string, unlocked: boolean) => void;
}

export function AchievementsScreen(props: AchievementsProps) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;
  const [selected, setSelected] = useState<AchievementDefinition | null>(null);

  const conditionArgs = {
    tutorialComplete: props.tutorialComplete,
    levelStars: props.levelStars,
    hintedLevelsCount: props.achievementProgress.hintedLevels.size,
    noHintLevelsCount: props.achievementProgress.noHintLevels.size,
    cleanStreakLength: props.achievementProgress.cleanStreak.length,
    perfectStreakLength: props.achievementProgress.perfectStreak.length,
  };
  const unlocked = unlockedIds(conditionArgs);

  /** Live progress towards an achievement's condition, as the counter the
   * condition is written in. Null once unlocked: a bar pinned at 100% beside
   * a trophy already labelled ПОЛУЧЕНО is the third way of saying the same
   * thing, and the earned art carries it better. */
  const progressOf = (id: string): AchievementProgressCount | null =>
    unlocked.has(id) ? null : progressCountFor(id, conditionArgs);

  const grid = (
    <AchievementGrid
      unlocked={unlocked}
      progressOf={progressOf}
      onSelect={(achievement) => {
        setSelected(achievement);
        props.onAchievementViewed?.(achievement.id, unlocked.has(achievement.id));
      }}
    />
  );
  const stats = (
    <>
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 1,
          color: 'var(--gold)',
          marginBottom: 8,
        }}
      >
        {unlocked.size} ИЗ {allAchievements.length} ПОЛУЧЕНО
      </div>
      <div style={{ marginBottom: 14 }}>
        <ProgressSummary progress={props.progress} />
      </div>
    </>
  );

  return (
    <>
      {isLandscape ? (
        <LandscapeAchievementsScene onBack={props.onBack} stats={stats} grid={grid} />
      ) : (
        <PortraitAchievementsScene onBack={props.onBack} stats={stats} grid={grid} />
      )}
      {selected && (
        <AchievementDetailDialog
          achievement={selected}
          unlocked={unlocked.has(selected.id)}
          unlockedAt={props.achievementUnlockedAt.get(selected.id)}
          progress={progressOf(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function PortraitAchievementsScene({
  onBack,
  stats,
  grid,
}: {
  onBack: () => void;
  stats: ReactNode;
  grid: ReactNode;
}) {
  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
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
          ДОСТИЖЕНИЯ
        </div>
        <div
          className="dozor-scroll-panel"
          style={{
            position: 'absolute',
            top: 144,
            left: 32,
            right: 32,
            bottom: 24,
            borderRadius: 14,
            background: 'rgba(11,23,51,0.9)',
            border: '1.5px solid rgba(216,165,55,0.85)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
            padding: 16,
            overflowY: 'auto',
          }}
        >
          {stats}
          {grid}
        </div>
      </div>
    </DesignCanvas>
  );
}

function LandscapeAchievementsScene({
  onBack,
  stats,
  grid,
}: {
  onBack: () => void;
  stats: ReactNode;
  grid: ReactNode;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={asset('assets/images/menu-castle-bg-web-wide.webp')}
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
        ДОСТИЖЕНИЯ
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
        {stats}
        {grid}
      </div>
    </div>
  );
}

function AchievementGrid({
  unlocked,
  progressOf,
  onSelect,
}: {
  unlocked: Set<string>;
  progressOf: (id: string) => AchievementProgressCount | null;
  onSelect: (achievement: AchievementDefinition) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
      {allAchievements.map((achievement) => (
        <AchievementTile
          key={achievement.id}
          achievement={achievement}
          unlocked={unlocked.has(achievement.id)}
          progress={progressOf(achievement.id)}
          onClick={() => onSelect(achievement)}
        />
      ))}
    </div>
  );
}

function AchievementTile({
  achievement,
  unlocked,
  progress,
  onClick,
}: {
  achievement: AchievementDefinition;
  unlocked: boolean;
  /** Null once unlocked — see `progressOf`. */
  progress: AchievementProgressCount | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '20px 14px 16px',
        borderRadius: 16,
        border: `1.4px solid ${unlocked ? '#d8a537' : 'rgba(92,102,125,0.38)'}`,
        background: unlocked ? 'rgba(20,40,84,0.95)' : 'rgba(10,16,34,0.83)',
        cursor: 'pointer',
      }}
    >
      <AchievementReveal achievement={achievement} size={92} unlocked={unlocked} animate={false} />
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          lineHeight: 1.25,
          textAlign: 'center',
          color: unlocked ? 'var(--gold-bright)' : 'rgba(180,190,212,0.66)',
        }}
      >
        {achievement.title}
      </div>
      {progress && <AchievementProgressBar progress={progress} />}
    </button>
  );
}

export function AchievementProgressBar({ progress }: { progress: AchievementProgressCount }) {
  const percent = Math.round(progressFraction(progress) * 100);
  // "8 из 50" says what is left; "16%" made the player do the arithmetic
  // backwards, and at 2% the bar itself is a dot.
  const label = progressLabel(progress);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 3,
            background: 'linear-gradient(90deg, #d8a537, #ffe6a0)',
            boxShadow: percent > 0 ? '0 0 6px rgba(255,214,120,0.55)' : 'none',
            transition: 'width 260ms ease-out',
          }}
        />
      </div>
      <span
        style={{
          minWidth: 34,
          textAlign: 'right',
          flexShrink: 0,
          fontSize: 10.5,
          fontFamily: 'var(--font-display)',
          color: 'var(--gold)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function AchievementDetailDialog({
  achievement,
  unlocked,
  unlockedAt,
  progress,
  onClose,
}: {
  achievement: AchievementDefinition;
  unlocked: boolean;
  unlockedAt?: string;
  /** Null once unlocked — see `progressOf`. */
  progress: AchievementProgressCount | null;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        zIndex: 30,
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(1,4,14,0.79)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          padding: '36px 28px 28px',
          border: '2px solid #d0a344',
          borderRadius: 22,
          background: 'linear-gradient(145deg, #203c7b, #0b1637)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.72)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <AchievementReveal achievement={achievement} size={168} unlocked={unlocked} animate={false} />
        <h2
          style={{
            margin: '20px 0 6px',
            color: 'var(--gold-bright)',
            fontFamily: 'var(--font-display)',
            fontSize: 21,
            letterSpacing: 1,
          }}
        >
          {achievement.title}
        </h2>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.8,
            color: unlocked ? '#3ee0a6' : 'rgba(180,190,212,0.66)',
            marginBottom: 12,
          }}
        >
          {unlocked ? 'ПОЛУЧЕНО' : 'НЕ ПОЛУЧЕНО'}
          {unlocked && unlockedAt ? ` · ${formatDate(unlockedAt)}` : ''}
        </div>
        <p style={{ margin: '0 0 16px', color: '#d9e4f8', fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>
          {achievement.description}
        </p>
        {progress && <AchievementProgressBar progress={progress} />}
        {/* A corner close affordance instead of a full-width "ЗАКРЫТЬ"
            button: dismissing is the least interesting thing on this dialog,
            and a button at the bottom gave it the same weight as the
            achievement itself. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            color: 'rgba(255,226,164,0.72)',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
