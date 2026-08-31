import { useState } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';

export function MenuScreen({
  onPlay,
  onLevels,
  onSettings,
}: {
  onPlay: () => void;
  onLevels: () => void;
  onSettings: () => void;
}) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeMenuScene onPlay={onPlay} onLevels={onLevels} onSettings={onSettings} />;
  }

  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
        <img
          src={asset("assets/images/menu-castle-bg-clean.webp")}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 104,
            background: 'linear-gradient(to bottom, #000, transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 92,
            background: 'linear-gradient(to bottom, transparent, #000)',
          }}
        />
        <div style={{ position: 'absolute', top: 354, left: 78, right: 78, height: 104 }}>
          <MenuActionButton label="ИГРАТЬ" onClick={onPlay} prominent />
        </div>
        <div style={{ position: 'absolute', top: 474, left: 92, right: 92, height: 72 }}>
          <MenuActionButton label="УРОВНИ" onClick={onLevels} />
        </div>
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <MenuSettingsButton onClick={onSettings} />
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
 * A dedicated wide menu avoids letterboxing the portrait illustration when
 * the browser window is wider than it is tall. The artwork has open, darker
 * space in its middle so the controls stay legible without hiding the
 * candle, window or telescope.
 */
function LandscapeMenuScene({
  onPlay,
  onLevels,
  onSettings,
}: {
  onPlay: () => void;
  onLevels: () => void;
  onSettings: () => void;
}) {
  const { width, height } = useViewportSize();
  const panelWidth = Math.min(290, Math.max(210, width * 0.27));
  // Centred on the screen's own edges rather than the artwork's off-centre
  // dark pocket (the Dart source's 0.44 factor reads as visibly off-centre
  // once the window is much wider than the source art's own proportions).
  const panelLeft = (width - panelWidth) / 2;
  const panelTop = height * 0.39;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={asset("assets/images/menu-castle-bg-web-wide.webp")}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 45% 45%, rgba(0,0,0,0.07), rgba(0,0,0,0.52))',
        }}
      />
      <div style={{ position: 'absolute', top: panelTop, left: panelLeft, width: panelWidth, height: 82 }}>
        <MenuActionButton label="ИГРАТЬ" onClick={onPlay} prominent />
      </div>
      <div
        style={{
          position: 'absolute',
          top: panelTop + 94,
          left: panelLeft + panelWidth * 0.08,
          width: panelWidth * 0.84,
          height: 62,
        }}
      >
        <MenuActionButton label="УРОВНИ" onClick={onLevels} />
      </div>
      <div style={{ position: 'absolute', top: 18, right: 24 }}>
        <MenuSettingsButton onClick={onSettings} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 14,
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: 'rgba(154,163,180,0.55)',
        }}
      >
        версия 1.0.0
      </div>
    </div>
  );
}

export function MenuActionButton({
  label,
  onClick,
  prominent = false,
  fontSize,
  letterSpacing,
}: {
  label: string;
  onClick: () => void;
  prominent?: boolean;
  /** Overrides the default size — used where the button is narrower than
   * the main menu's (e.g. side-by-side in a landscape two-button row), so
   * a longer label like "ПРОДОЛЖИТЬ" doesn't spill past the frame art. */
  fontSize?: number;
  letterSpacing?: number;
}) {
  const [pressed, setPressed] = useState(false);
  const backgroundAsset = asset(prominent ? 'assets/images/menu-button-play.webp' : 'assets/images/menu-button-levels.webp');
  return (
    <button
      type="button"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: 'transparent',
        transform: pressed ? 'scale(0.965)' : 'scale(1)',
        transition: 'transform 110ms cubic-bezier(0.33,1,0.68,1)',
      }}
    >
      <img src={backgroundAsset} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} draggable={false} />
      <span
        style={{
          position: 'relative',
          fontFamily: 'var(--font-body)',
          color: 'var(--gold-bright)',
          fontSize: fontSize ?? (prominent ? 26 : 19),
          fontWeight: 900,
          letterSpacing: letterSpacing ?? (prominent ? 2.7 : 2.1),
          textShadow: '0 2px 3px rgba(0,0,0,0.66)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
}

function MenuSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Настройки"
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'rgba(18,32,68,0.85)',
        border: '1.7px solid rgba(216,165,55,0.85)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.53)',
        color: 'var(--gold)',
        fontSize: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      ⚙
    </button>
  );
}
