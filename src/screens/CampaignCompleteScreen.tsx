import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useViewportSize } from '../components/game/useViewportSize';
import { MenuActionButton } from './MenuScreen';
import { AchievementReveal } from '../components/shared/AchievementReveal';
import type { AchievementDefinition } from '../data/achievements';
import { campaignLevels } from '../data/campaignLevels';
import { asset } from '../lib/assetUrl';

const COINS = [
  { target: 1, left: 60, top: 300, size: 44 },
  { target: 2, left: 326, top: 320, size: 46 },
  { target: 3, left: 100, top: 560, size: 42 },
  { target: 4, left: 300, top: 580, size: 44 },
];

interface CampaignCompleteProps {
  onLevels: () => void;
  onMenu: () => void;
  /** Defaults to "КАМПАНИЯ ПРОЙДЕНА"; a '\n' renders as a line break — used
   * for the two-line main-campaign checkpoint title. */
  title?: string;
  /** Defaults to "Вы открыли все {campaignLevels.length} уровней". */
  subtitle?: string;
  /** Defaults to "К УРОВНЯМ" / onLevels. */
  primaryLabel?: string;
  onPrimary?: () => void;
  /** Defaults to "В МЕНЮ" / onMenu. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** The achievement tied to this checkpoint (e.g. "Хранитель короны" for
   * finishing the main campaign, "Владыка рун" for finishing everything),
   * shown revealing inline — mirrors the mobile app's inline reveal on this
   * screen, which always shows the relevant trophy here regardless of
   * whether it's actually unlocked yet (`animateAchievement` only controls
   * whether the reveal-from-locked animation plays right now). */
  achievement?: AchievementDefinition | null;
  animateAchievement?: boolean;
  onAchievementRevealed?: () => void;
}

function TitleText({ title, fontSize }: { title: string; fontSize: number }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize,
        lineHeight: 1.25,
        letterSpacing: 2,
        color: 'var(--gold-bright)',
        textShadow: '0 3px 8px rgba(0,0,0,0.8)',
        whiteSpace: 'pre-line',
      }}
    >
      {title}
    </div>
  );
}

export function CampaignCompleteScreen(props: CampaignCompleteProps) {
  const { onLevels, onMenu } = props;
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeCampaignCompleteScene {...props} viewport={viewport} />;
  }

  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
        <div
          style={{
            position: 'absolute',
            left: 15,
            right: 15,
            top: 260,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #f9d868, transparent)',
            opacity: 0.4,
          }}
        />
        {COINS.map((coin) => (
          <img
            key={coin.target}
            src={asset(`assets/images/coin-${coin.target}.webp`)}
            alt=""
            loading="lazy"
            style={{ position: 'absolute', left: coin.left, top: coin.top, width: coin.size, height: coin.size }}
            draggable={false}
          />
        ))}
        <div style={{ position: 'absolute', left: 32, right: 32, top: 360, textAlign: 'center' }}>
          {props.achievement && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1.3, color: '#ffd678', marginBottom: 6 }}>
                ДОСТИЖЕНИЕ ОТКРЫТО
              </div>
              <AchievementReveal
                achievement={props.achievement}
                size={72}
                animate={props.animateAchievement}
                onRevealed={props.onAchievementRevealed}
              />
              <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--gold-bright)' }}>
                {props.achievement.title}
              </div>
            </div>
          )}
          <TitleText title={props.title ?? 'КАМПАНИЯ ПРОЙДЕНА'} fontSize={27} />
          <div style={{ height: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-soft)' }}>
            {props.subtitle ?? `Вы открыли все ${campaignLevels.length} уровней`}
          </div>
        </div>
        <div style={{ position: 'absolute', top: 560, left: 78, right: 78, height: 68 }}>
          <MenuActionButton label={props.primaryLabel ?? 'К УРОВНЯМ'} onClick={props.onPrimary ?? onLevels} />
        </div>
        <div style={{ position: 'absolute', top: 640, left: 78, right: 78, height: 68 }}>
          <MenuActionButton label={props.secondaryLabel ?? 'В МЕНЮ'} onClick={props.onSecondary ?? onMenu} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 26,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: 'rgba(154,163,180,0.55)',
          }}
        >
          версия 1.0.0
        </div>
      </div>
    </DesignCanvas>
  );
}

/**
 * Wide-screen campaign finale: a centred panel over the wide castle art,
 * with the celebratory coins scattered either side of it instead of above
 * and below a narrow portrait column.
 */
function LandscapeCampaignCompleteScene({
  onLevels,
  onMenu,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  achievement,
  animateAchievement,
  onAchievementRevealed,
  viewport,
}: CampaignCompleteProps & { viewport: { width: number; height: number } }) {
  const { width, height } = viewport;
  const panelWidth = Math.min(720, Math.max(440, width * 0.48));
  const panelLeft = (width - panelWidth) / 2;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={asset("assets/images/menu-castle-bg-web-wide.webp")}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.53)' }} />
      <div
        style={{
          position: 'absolute',
          left: width * 0.29,
          right: width * 0.29,
          top: height * 0.22,
          height: height * 0.52,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #f9d868, transparent)',
          opacity: 0.4,
        }}
      />
      <img
        src={asset("assets/images/coin-1.webp")}
        alt=""
        loading="lazy"
        style={{ position: 'absolute', left: panelLeft - 70, top: height * 0.34, width: 48, height: 48 }}
        draggable={false}
      />
      <img
        src={asset("assets/images/coin-2.webp")}
        alt=""
        loading="lazy"
        style={{ position: 'absolute', left: panelLeft + panelWidth + 24, top: height * 0.32, width: 50, height: 50 }}
        draggable={false}
      />
      <img
        src={asset("assets/images/coin-3.webp")}
        alt=""
        loading="lazy"
        style={{ position: 'absolute', left: panelLeft - 22, top: height * 0.62, width: 45, height: 45 }}
        draggable={false}
      />
      <img
        src={asset("assets/images/coin-4.webp")}
        alt=""
        loading="lazy"
        style={{ position: 'absolute', left: panelLeft + panelWidth - 22, top: height * 0.64, width: 47, height: 47 }}
        draggable={false}
      />
      <div style={{ position: 'absolute', top: height * 0.28, left: panelLeft, width: panelWidth, textAlign: 'center' }}>
        {achievement && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1.3, color: '#ffd678', marginBottom: 6 }}>
              ДОСТИЖЕНИЕ ОТКРЫТО
            </div>
            <AchievementReveal achievement={achievement} size={72} animate={animateAchievement} onRevealed={onAchievementRevealed} />
            <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--gold-bright)' }}>
              {achievement.title}
            </div>
          </div>
        )}
        <TitleText title={title ?? 'КАМПАНИЯ ПРОЙДЕНА'} fontSize={31} />
        <div style={{ height: 14 }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-soft)' }}>
          {subtitle ?? `Вы открыли все ${campaignLevels.length} уровней`}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: height * 0.56,
          left: panelLeft,
          width: panelWidth,
          height: 68,
          display: 'flex',
          gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <MenuActionButton label={primaryLabel ?? 'К УРОВНЯМ'} onClick={onPrimary ?? onLevels} />
        </div>
        <div style={{ flex: 1 }}>
          <MenuActionButton label={secondaryLabel ?? 'В МЕНЮ'} onClick={onSecondary ?? onMenu} />
        </div>
      </div>
    </div>
  );
}
