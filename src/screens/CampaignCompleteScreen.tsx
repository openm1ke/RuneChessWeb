import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useViewportSize } from '../components/game/useViewportSize';
import { MenuActionButton } from './MenuScreen';
import { campaignLevels } from '../data/campaignLevels';
import { asset } from '../lib/assetUrl';

const COINS = [
  { target: 1, left: 60, top: 300, size: 44 },
  { target: 2, left: 326, top: 320, size: 46 },
  { target: 3, left: 100, top: 560, size: 42 },
  { target: 4, left: 300, top: 580, size: 44 },
];

export function CampaignCompleteScreen({ onLevels, onMenu }: { onLevels: () => void; onMenu: () => void }) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeCampaignCompleteScene onLevels={onLevels} onMenu={onMenu} viewport={viewport} />;
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
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 27,
              letterSpacing: 2,
              color: 'var(--gold-bright)',
              textShadow: '0 3px 8px rgba(0,0,0,0.8)',
            }}
          >
            КАМПАНИЯ ПРОЙДЕНА
          </div>
          <div style={{ height: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-soft)' }}>
            Вы открыли все {campaignLevels.length} уровней
          </div>
        </div>
        <div style={{ position: 'absolute', top: 560, left: 78, right: 78, height: 68 }}>
          <MenuActionButton label="К УРОВНЯМ" onClick={onLevels} />
        </div>
        <div style={{ position: 'absolute', top: 640, left: 78, right: 78, height: 68 }}>
          <MenuActionButton label="В МЕНЮ" onClick={onMenu} />
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
  viewport,
}: {
  onLevels: () => void;
  onMenu: () => void;
  viewport: { width: number; height: number };
}) {
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
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 31,
            letterSpacing: 2,
            color: 'var(--gold-bright)',
            textShadow: '0 3px 8px rgba(0,0,0,0.8)',
          }}
        >
          КАМПАНИЯ ПРОЙДЕНА
        </div>
        <div style={{ height: 14 }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-soft)' }}>
          Вы открыли все {campaignLevels.length} уровней
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
          <MenuActionButton label="К УРОВНЯМ" onClick={onLevels} />
        </div>
        <div style={{ flex: 1 }}>
          <MenuActionButton label="В МЕНЮ" onClick={onMenu} />
        </div>
      </div>
    </div>
  );
}
