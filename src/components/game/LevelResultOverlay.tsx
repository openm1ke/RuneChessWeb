import { useEffect, useRef, useState } from 'react';
import type { LevelAttemptResult } from '../../game/starRating';
import type { AchievementDefinition } from '../../data/achievements';
import { StarAsset } from '../shared/StarRow';
import { AchievementReveal } from '../shared/AchievementReveal';
import { playChime, playResultComplete, playResultContinue } from '../../services/musicService';

const CAPTIONS: Record<number, string> = {
  3: 'Отличное решение!',
  2: 'Хорошо! Ещё немного — и все три звезды ваши.',
  1: 'Сыграйте ещё раз для лучшего результата.',
};

/** Shown the instant every beacon first reaches its exact target. */
export function LevelResultOverlay({
  result,
  onContinue,
  onRetry,
  bonusStarOffered = false,
  bonusStarEnabled = false,
  onBonusStarRequested,
  achievement = null,
  onAchievementRevealed,
}: {
  result: LevelAttemptResult;
  onContinue: () => void;
  onRetry: () => void;
  /** Whether the "звезда за рекламу" block should be shown at all — solved
   * with zero hints and below 3 stars. Mirrors the mobile app's
   * `_bonusStarOffered`. */
  bonusStarOffered?: boolean;
  /** Whether the block is currently tappable (a rewarded ad isn't already
   * loading/showing for this placement). */
  bonusStarEnabled?: boolean;
  onBonusStarRequested?: () => void;
  /** A newly-unlocked achievement to reveal inline, above the star row —
   * mirrors the mobile app's `resultAchievement`. */
  achievement?: AchievementDefinition | null;
  onAchievementRevealed?: () => void;
}) {
  const scored = result.stars != null;
  const [t, setT] = useState(0);
  const [exiting, setExiting] = useState(false);
  const playedChimes = useRef(new Set<number>());
  const startRef = useRef<number | null>(null);
  const duration = scored ? 1300 : 550;

  // Plays once, immediately on mount — i.e. the instant the level is solved.
  useEffect(() => playResultComplete(), []);

  useEffect(() => {
    let raf = 0;
    const tick = (time: number) => {
      if (startRef.current == null) startRef.current = time;
      const progress = Math.min(1, (time - startRef.current) / duration);
      setT(progress);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  useEffect(() => {
    const stars = result.stars;
    if (stars == null) return;
    for (let index = 0; index < stars; index++) {
      const fillStartsAt = 0.3 + index * 0.16;
      if (t >= fillStartsAt + 0.08 && !playedChimes.current.has(index)) {
        playedChimes.current.add(index);
        playChime(0.38);
      }
    }
  }, [t, result.stars]);

  const phase = (start: number, end: number) => Math.min(1, Math.max(0, (t - start) / (end - start)));

  const cardWindow: [number, number] = scored ? [0, 0.3] : [0, 0.55];
  const titleWindow: [number, number] = scored ? [0.12, 0.32] : [0.2, 0.55];
  const captionWindow: [number, number] = scored ? [0.88, 1.0] : [0, 0];
  const buttonWindow: [number, number] = scored ? [0.92, 1.0] : [0.55, 1.0];

  const handleContinue = () => {
    if (exiting) return;
    playResultContinue();
    setExiting(true);
    window.setTimeout(onContinue, 240);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: exiting ? 0 : 1,
        transition: 'opacity 240ms ease-in',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(0,0,0,${0.7 * Math.min(1, t / 0.35)})`,
        }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            margin: '0 44px',
            padding: '26px 24px 20px',
            borderRadius: 22,
            background: 'linear-gradient(to bottom, rgba(30,48,104,0.96), rgba(15,26,60,0.96))',
            border: '2px solid var(--gold-border)',
            boxShadow: '0 14px 30px rgba(0,0,0,0.6)',
            opacity: phase(cardWindow[0], cardWindow[1] * 0.6),
            transform: `scale(${0.8 + 0.2 * phase(cardWindow[0], cardWindow[1])})`,
            textAlign: 'center',
            minWidth: 260,
          }}
        >
          <div
            style={{
              opacity: phase(titleWindow[0], titleWindow[1]),
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              letterSpacing: 2.2,
              color: 'var(--gold-bright)',
            }}
          >
            УРОВЕНЬ ПРОЙДЕН
          </div>
          {achievement && (
            <div style={{ opacity: phase(titleWindow[0], titleWindow[1]), marginTop: 12 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  letterSpacing: 1.3,
                  color: '#ffd678',
                  marginBottom: 8,
                }}
              >
                ДОСТИЖЕНИЕ ОТКРЫТО
              </div>
              <AchievementReveal achievement={achievement} size={80} animate onRevealed={onAchievementRevealed} />
              <div
                style={{
                  marginTop: 6,
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  color: 'var(--gold-bright)',
                }}
              >
                {achievement.title}
              </div>
            </div>
          )}
          {result.stars != null ? (
            <>
              <div style={{ height: 18 }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <AnimatedResultStar
                    key={i}
                    filled={i < result.stars!}
                    fill={phase(0.3 + i * 0.16, 0.3 + i * 0.16 + 0.28)}
                  />
                ))}
              </div>
              <div style={{ height: 14 }} />
              <div
                style={{
                  opacity: phase(captionWindow[0], captionWindow[1]),
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-soft)',
                }}
              >
                {CAPTIONS[result.stars]}
              </div>
            </>
          ) : (
            <div style={{ height: 6 }} />
          )}
          <div style={{ height: 20 }} />
          <div style={{ opacity: phase(buttonWindow[0], buttonWindow[1]) }}>
            <button
              type="button"
              onClick={handleContinue}
              style={{
                padding: '10px 30px',
                borderRadius: 14,
                border: '2.5px solid var(--gold)',
                background: 'linear-gradient(var(--success-a), var(--success-b))',
                color: '#04281c',
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                letterSpacing: 3,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
              }}
            >
              ПРОДОЛЖИТЬ
            </button>
            {result.stars != null && result.stars < 3 && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={onRetry}
                  style={{
                    padding: '8px 22px',
                    borderRadius: 12,
                    border: '1.3px solid rgba(255,226,164,0.5)',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--gold-bright)',
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.3,
                    cursor: 'pointer',
                  }}
                >
                  ПРОЙТИ ЕЩЁ РАЗ
                </button>
              </div>
            )}
            {bonusStarOffered && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  disabled={!bonusStarEnabled}
                  onClick={onBonusStarRequested}
                  style={{
                    padding: '8px 22px',
                    borderRadius: 12,
                    border: '1.3px solid rgba(255,226,164,0.6)',
                    background: 'linear-gradient(to bottom, rgba(224,168,63,0.28), rgba(224,168,63,0.1))',
                    color: 'var(--gold-bright)',
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.1,
                    cursor: bonusStarEnabled ? 'pointer' : 'default',
                    opacity: bonusStarEnabled ? 1 : 0.5,
                  }}
                >
                  🎬 ЗВЕЗДА ЗА РЕКЛАМУ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedResultStar({ filled, fill }: { filled: boolean; fill: number }) {
  return (
    <div style={{ position: 'relative', width: 32, height: 32 }}>
      <StarAsset filled={false} size={32} />
      {filled && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 32,
            height: 32 * Math.max(0.0001, fill),
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', bottom: 0 }}>
            <StarAsset filled size={32} />
          </div>
        </div>
      )}
    </div>
  );
}
