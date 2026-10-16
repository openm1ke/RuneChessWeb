import { achievementTitle } from '../../data/achievements';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useL10n } from '../../l10n/l10nContext';
import type { LevelAttemptResult } from '../../game/starRating';
import type { AchievementDefinition } from '../../data/achievements';
import { StarAsset } from '../shared/StarRow';
import { AchievementReveal } from '../shared/AchievementReveal';
import { playChime, playResultComplete, playResultContinue } from '../../services/musicService';


/** Shown the instant every beacon first reaches its exact target. */
export function LevelResultOverlay({
  result,
  onContinue,
  onRetry,
  bonusStarOffered = false,
  bonusStarEnabled = false,
  bonusStarNotice = null,
  onBonusStarRequested,
  doublesDailyStars = false,
  achievement = null,
  onAchievementRevealed,
  dock = null,
}: {
  result: LevelAttemptResult;
  onContinue: () => void;
  onRetry: () => void;
  /** Whether the "звезда за рекламу" block should be shown at all — solved
   * below 3 stars. A hint does not remove the chance to improve a result.
   * Mirrors the mobile app's
   * `_bonusStarOffered`. */
  bonusStarOffered?: boolean;
  /** Whether the block is currently tappable (a rewarded ad isn't already
   * loading/showing for this placement). */
  bonusStarEnabled?: boolean;
  /** Explains that a technical ad failure was converted into the promised
   * star. Kept inside the offer card so the result stays easy to scan. */
  bonusStarNotice?: string | null;
  onBonusStarRequested?: () => void;
  /** Whether that offer is the daily challenge's "double what today paid"
   * rather than the campaign's "+1 star" — see the mobile app's
   * `LevelResultOverlay.doublesDailyStars`. */
  doublesDailyStars?: boolean;
  /** A newly-unlocked achievement to reveal inline, above the star row —
   * mirrors the mobile app's `resultAchievement`. */
  achievement?: AchievementDefinition | null;
  onAchievementRevealed?: () => void;
  /** Portrait only: the strip the panel lives in, in canvas units — from
   * the board frame's lower edge to `bottom` above the canvas's own. The
   * panel is centred there and scales down inside it rather than ever
   * climbing onto the board. Null keeps the centred card (landscape). */
  dock?: { top: number; bottom: number; width: number } | null;
}) {
  const l10n = useL10n();
  const scored = result.stars != null;
  const [t, setT] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [bonusStarReveal, setBonusStarReveal] = useState<{ index: number; progress: number } | null>(null);
  const playedChimes = useRef(new Set<number>());
  const previousStars = useRef(result.stars);
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

  // A rewarded/fallback star arrives after the initial ceremony. Animate
  // that one empty star filling rather than making it appear abruptly.
  useEffect(() => {
    const before = previousStars.current;
    const after = result.stars;
    previousStars.current = after;
    if (before == null || after == null || after <= before) return;
    const index = before;
    let raf = 0;
    const startedAt = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / 620);
      setBonusStarReveal({ index, progress });
      if (progress < 1) raf = requestAnimationFrame(tick);
      else playChime(0.55);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result.stars]);

  const phase = (start: number, end: number) => Math.min(1, Math.max(0, (t - start) / (end - start)));

  const cardWindow: [number, number] = scored ? [0, 0.3] : [0, 0.55];
  const titleWindow: [number, number] = scored ? [0.12, 0.32] : [0.2, 0.55];
  const captionWindow: [number, number] = scored ? [0.88, 1.0] : [0, 0];
  const buttonWindow: [number, number] = scored ? [0.92, 1.0] : [0.55, 1.0];

  const strip = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  // offsetHeight ignores transforms, so this measures the panel's natural
  // height however it is currently scaled.
  useLayoutEffect(() => {
    if (!dock) return;
    const measure = () => {
      const room = strip.current?.clientHeight ?? 0;
      const need = panel.current?.offsetHeight ?? 0;
      if (room > 0 && need > 0) setFit(Math.min(1, room / need));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    if (panel.current) observer.observe(panel.current);
    if (strip.current) observer.observe(strip.current);
    return () => observer.disconnect();
  }, [dock, bonusStarOffered, bonusStarNotice, achievement, result.stars]);

  const docked = dock != null;
  const showRetry = result.stars != null && result.stars < 3;
  const blockWidth = docked ? dock.width - 40 : 280;

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
      {/* A light wash, not a blackout: the solved board is what the player
          wants to look at while deciding whether to replay. It still takes
          the taps, so the board cannot be played under the panel. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(26,16,38,${(docked ? 0.35 : 0.55) * Math.min(1, t / 0.35)})`,
        }}
      />
      <div
        ref={strip}
        style={
          docked
            ? { position: 'absolute', left: 0, right: 0, top: dock.top, bottom: dock.bottom, display: 'flex', alignItems: 'center', justifyContent: 'center' }
            : { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
        }
      >
        <div
          ref={panel}
          style={{
            flex: 'none',
            width: docked ? dock.width : undefined,
            boxSizing: 'border-box',
            margin: docked ? 0 : '0 44px',
            padding: docked ? '16px 20px 16px' : '26px 24px 20px',
            borderRadius: 22,
            background: 'linear-gradient(to bottom, rgba(30,48,104,0.96), rgba(15,26,60,0.96))',
            border: '2px solid var(--gold-border)',
            boxShadow: '0 14px 30px rgba(0,0,0,0.6)',
            opacity: phase(cardWindow[0], cardWindow[1] * 0.6),
            transform: `scale(${fit * (docked ? 0.88 + 0.12 * phase(cardWindow[0], cardWindow[1]) : 0.8 + 0.2 * phase(cardWindow[0], cardWindow[1]))})`,
            transformOrigin: 'center',
            textAlign: 'center',
            minWidth: 260,
          }}
        >
          <div
            style={{
              opacity: phase(titleWindow[0], titleWindow[1]),
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              letterSpacing: 1.6,
              color: 'var(--gold-bright)',
            }}
          >
            {l10n.resultLevelComplete.toUpperCase()}
          </div>
          {achievement && (
            // A row, not a stack: icon beside its name. Stacked, the reveal
            // made the panel too tall for the strip under the board, and the
            // whole panel — achievement included — was scaled down to ~70%
            // to fit. Side by side it is half the height, so the icon can be
            // drawn larger and the panel stays at its full size.
            <div
              style={{
                opacity: phase(titleWindow[0], titleWindow[1]),
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '6px 12px',
                borderRadius: 16,
                background: 'rgba(255,215,122,0.08)',
                border: '1px solid rgba(255,215,122,0.28)',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 'none' }}>
                <AchievementReveal achievement={achievement} size={68} animate onRevealed={onAchievementRevealed} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                    letterSpacing: 0.9,
                    color: '#ffd678',
                  }}
                >
                  {l10n.resultAchievementUnlocked.toUpperCase()}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    lineHeight: 1.15,
                    color: 'var(--gold-bright)',
                  }}
                >
                  {achievementTitle(l10n, achievement.id)}
                </div>
              </div>
            </div>
          )}
          {result.stars != null ? (
            <>
              <div style={{ height: 12 }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <AnimatedResultStar
                    key={i}
                    filled={i < result.stars!}
                    fill={bonusStarReveal?.index === i
                      ? bonusStarReveal.progress
                      : phase(0.3 + i * 0.16, 0.3 + i * 0.16 + 0.28)}
                  />
                ))}
              </div>
              <div style={{ height: bonusStarOffered ? 4 : 10 }} />
              {!bonusStarOffered && (
                <div
                  style={{
                    opacity: phase(captionWindow[0], captionWindow[1]),
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-soft)',
                  }}
                >
                  {
                    (
                      {
                        3: l10n.resultExcellent,
                        2: l10n.resultGood,
                        1: l10n.resultTryAgain,
                      } as Record<number, string>
                    )[result.stars]
                  }
                </div>
              )}
              {bonusStarNotice && (
                <div
                  role="status"
                  style={{
                    marginTop: 10,
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: 'var(--gold-bright)',
                  }}
                >
                  {bonusStarNotice}
                </div>
              )}
            </>
          ) : (
            <div style={{ height: 6 }} />
          )}
          <div style={{ height: 12 }} />
          <div
            style={{
              opacity: phase(buttonWindow[0], buttonWindow[1]),
              // One shared width for everything stacked here. Left to
              // themselves these controls size to their own labels, which
              // made "ПРОДОЛЖИТЬ" and the ad offer different widths for no
              // reason the player could read as meaning anything.
              width: blockWidth,
              maxWidth: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {bonusStarOffered && (
              <button
                type="button"
                disabled={!bonusStarEnabled}
                onClick={onBonusStarRequested}
                aria-label={
                  doublesDailyStars
                    ? l10n.resultDoubleStarsForAd
                    : l10n.resultStarForAd
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 68,
                  marginBottom: 10,
                  padding: '13px 16px 13px 14px',
                  borderRadius: 14,
                  border: '1.6px solid rgba(207,162,68,0.54)',
                  background: 'rgba(255,215,122,0.12)',
                  textAlign: 'left',
                  cursor: bonusStarEnabled ? 'pointer' : 'default',
                  animation: bonusStarEnabled
                    ? 'bonus-star-offer-glow 2.4s ease-in-out infinite'
                    : undefined,
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(255,215,122,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 23,
                    color: 'var(--gold-bright)',
                  }}
                  aria-hidden="true"
                >
                  {doublesDailyStars ? '✦' : '★'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      // What the video buys, readable at a glance: 14/11.5
                      // arrived at 10-12px and 9-10px on a phone.
                      fontSize: 17,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                      color: 'var(--gold-bright)',
                    }}
                  >
                    {doublesDailyStars
                      ? l10n.resultDoubleStars(result.stars ?? 0)
                      : l10n.resultEarnStar}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 3,
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--text-soft)',
                    }}
                  >
                    {bonusStarEnabled ? l10n.resultBonusStarHint : l10n.resultAdLoading}
                  </span>
                </span>
                <span
                  style={{ flex: '0 0 auto', fontSize: 22, color: 'rgba(255,215,122,0.78)' }}
                  aria-hidden="true"
                >
                  {bonusStarEnabled ? '▶' : '…'}
                </span>
              </button>
            )}
            {/* Replay sits beside Continue, not under it: a third row was the
                height that pushed the fullest panel past the strip. Only
                offered below three stars — a perfect run has nothing to
                retry for. */}
            <div style={{ display: 'flex', gap: 10 }}>
            {showRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  flex: '0 0 40%',
                  height: 56,
                  borderRadius: 14,
                  border: '2px solid rgba(255,226,164,0.45)',
                  background: 'rgba(14,25,60,0.6)',
                  color: 'rgba(255,226,164,0.86)',
                  fontSize: 14.5,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  lineHeight: 1.1,
                  padding: '0 6px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {l10n.resultRetry}
              </button>
            )}
            <button
              type="button"
              onClick={handleContinue}
              style={{
                flex: 1,
                minWidth: 0,
                height: 56,
                borderRadius: 14,
                border: '2.5px solid var(--gold)',
                background: 'linear-gradient(var(--success-a), var(--success-b))',
                color: '#04281c',
                fontFamily: 'var(--font-display)',
                // Shares its row with Replay; landscape's card is narrower.
                fontSize: docked ? 16 : 14,
                letterSpacing: docked ? 2.2 : 1.2,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
              }}
            >
              {l10n.commonContinue.toUpperCase()}
            </button>
            </div>
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
