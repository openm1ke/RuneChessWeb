import { nextRankAfter, rankForStars, starsToNextRank } from '../../game/campaignNames';
import { rankTitle } from '../../game/campaignNames';
import { useL10n } from '../../l10n/l10nContext';
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
  const l10n = useL10n();
  if (compact) {
    return (
      <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(198,211,237,0.75)' }}>
        {l10n.progressCompleted(progress.completedLevels, progress.totalLevels)}
        {` · ${progress.stars} ${l10n.progressStars(progress.stars)}${l10n.progressOfMax(progress.maxStars)}`}
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
        label={l10n.progressLevelsSolved}
        value={`${progress.completedLevels}/${progress.totalLevels}`}
      />
      <div style={{ height: 12 }} />
      <StatRow icon="★" label={l10n.progressStarsEarned} value={`${progress.stars}/${progress.maxStars}`} />
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
  const l10n = useL10n();
  const rank = rankForStars(stars);
  const next = nextRankAfter(stars);
  const toNext = starsToNextRank(stars);
  const filled = next == null ? 1 : (stars - rank.starsRequired) / (next.starsRequired - rank.starsRequired);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, color: 'var(--gold-bright)' }}>🎖</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#dce7ff' }}>{l10n.progressRank}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold-bright)' }}>{rankTitle(l10n, rank.id)}</span>
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
          ? l10n.progressTopRank
          : l10n.progressToNextRank(toNext ?? 0, rankTitle(l10n, next.id))}
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

