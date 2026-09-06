import { nextRankAfter, rankForStars, starsToNextRank } from '../../game/campaignNames';
import type { GameProgress } from '../../game/gameProgress';

/**
 * "How far am I" for the level list and the achievements screen.
 *
 * One component rather than two, because the two screens used to say this in
 * different words with different numbers. The layout still differs — the
 * level list has a scrolling grid to feed and can only spare a line, while
 * the achievements screen has room for the full panel — but the wording and
 * the numbers come from the same `GameProgress` either way.
 */
export function ProgressSummary({
  progress,
  compact = false,
}: {
  progress: GameProgress;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(198,211,237,0.75)' }}>
        {`Пройдено ${progress.completedLevels} из ${progress.totalLevels}`}
        {` · ${progress.stars} ${starWord(progress.stars)} из ${progress.maxStars}`}
      </div>
    );
  }
  return (
    <div
      style={{
        padding: '16px 20px',
        borderRadius: 20,
        background: 'linear-gradient(to bottom, rgba(27,48,102,0.89), rgba(8,23,53,0.88))',
        border: '1px solid rgba(215,164,55,0.66)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.44)',
      }}
    >
      <StatRow
        icon="✦"
        label="Пройдено уровней"
        value={`${progress.completedLevels}/${progress.totalLevels}`}
      />
      <div style={{ height: 12 }} />
      <StatRow icon="★" label="Получено звёзд" value={`${progress.stars}/${progress.maxStars}`} />
      <div style={{ height: 14 }} />
      <RankRow stars={progress.stars} />
    </div>
  );
}

/**
 * The rank the collected stars have earned, and how far the next one is.
 *
 * Stars used to accumulate and mean nothing beyond a few achievements. A rank
 * costs no art, no new economy and no balance risk, and it turns the number
 * into a place on a ladder — see `playerRanks`.
 */
function RankRow({ stars }: { stars: number }) {
  const rank = rankForStars(stars);
  const next = nextRankAfter(stars);
  const toNext = starsToNextRank(stars);
  const filled = next == null ? 1 : (stars - rank.starsRequired) / (next.starsRequired - rank.starsRequired);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, color: 'var(--gold-bright)' }}>🎖</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#dce7ff' }}>Звание</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold-bright)' }}>{rank.title}</span>
      </div>
      <div style={{ height: 8 }} />
      <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(1, filled)) * 100}%`,
            height: '100%',
            background: 'var(--gold)',
          }}
        />
      </div>
      <div style={{ height: 6 }} />
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(206,225,255,0.6)' }}>
        {next == null
          ? 'Высшее звание — все руны дозора ваши.'
          : `До звания «${next.title}» — ${toNext} ${starWord(toNext ?? 0)}`}
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 20, color: 'var(--gold)' }} aria-hidden="true">
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#dce7ff' }}>{label}</span>
      <span style={{ fontSize: 19, fontWeight: 900, color: 'var(--gold)' }}>{value}</span>
    </div>
  );
}

function starWord(stars: number): string {
  const mod100 = stars % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'звёзд';
  switch (stars % 10) {
    case 1:
      return 'звезда';
    case 2:
    case 3:
    case 4:
      return 'звезды';
    default:
      return 'звёзд';
  }
}
