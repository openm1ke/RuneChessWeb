import { useEffect, useState } from 'react';
import type { AchievementDefinition } from '../../data/achievements';

const REVEAL_DELAY_MS = 520;

/** An achievement icon that starts locked (grayscale + dim, mirroring
 * `StarAsset`'s unearned look in `StarRow.tsx`) and, when `animate` is set,
 * pops into full color with a soft glow after a short delay — a port of the
 * Flutter app's `AchievementReveal`. `animate` is for the "just unlocked
 * this instant" moment (level-result overlay, tutorial/campaign completion,
 * the celebration popup) and always ends up shown in color; for a static
 * icon (the achievements cabinet) pass `animate={false}` and `unlocked` to
 * say whether *this* icon should render locked or not. */
export function AchievementReveal({
  achievement,
  size,
  unlocked = true,
  animate = false,
  onRevealed,
}: {
  achievement: AchievementDefinition;
  size: number;
  /** Ignored while `animate` is set — an animated reveal always starts
   * locked and ends unlocked, regardless of this flag. */
  unlocked?: boolean;
  animate?: boolean;
  onRevealed?: () => void;
}) {
  const [revealed, setRevealed] = useState(!animate && unlocked);

  useEffect(() => {
    if (!animate) {
      setRevealed(unlocked);
      return;
    }
    setRevealed(false);
    const timer = window.setTimeout(() => {
      setRevealed(true);
      onRevealed?.();
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievement.id, animate, unlocked]);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        // inline-flex (not flex) so a `text-align: center` ancestor — the
        // pattern every caller of this component uses — actually centers
        // this fixed-width box instead of leaving it pinned to the left
        // edge, which a block-level flex container would do.
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {revealed && (
        <div
          style={{
            position: 'absolute',
            inset: -size * 0.2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,214,120,0.55) 0%, rgba(255,214,120,0) 70%)',
            transition: 'opacity 320ms ease-out',
          }}
        />
      )}
      <img
        src={achievement.assetPath}
        width={size}
        height={size}
        alt=""
        loading="lazy"
        style={{
          position: 'relative',
          display: 'block',
          transition: 'opacity 320ms ease-out, filter 320ms ease-out, transform 320ms ease-out',
          opacity: revealed ? 1 : 0.38,
          filter: revealed ? 'none' : 'grayscale(1)',
          transform: revealed ? 'scale(1)' : 'scale(0.86)',
        }}
      />
    </div>
  );
}

/** A full-screen popup used when more than one achievement unlocks at once
 * and only the first can be shown inline in `LevelResultOverlay` — a port
 * of the Flutter app's `AchievementCelebrationOverlay`. */
export function AchievementCelebrationOverlay({
  achievement,
  onDismiss,
  onRevealed,
}: {
  achievement: AchievementDefinition;
  onDismiss: () => void;
  onRevealed?: () => void;
}) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'rgba(10,8,20,0.78)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontFamily: '"Russo One", sans-serif',
          fontSize: 13,
          letterSpacing: 1.5,
          color: '#ffd678',
          textTransform: 'uppercase',
        }}
      >
        Достижение открыто
      </div>
      <AchievementReveal achievement={achievement} size={140} animate onRevealed={onRevealed} />
      <div
        style={{
          fontFamily: '"Russo One", sans-serif',
          fontSize: 18,
          color: '#fff',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {achievement.title}
      </div>
    </div>
  );
}
