import { DesignCanvas } from '../components/shared/DesignCanvas';
import { RoundControl } from '../components/shared/RoundControl';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';

interface SettingsProps {
  musicEnabled: boolean;
  musicVolume: number;
  onMusicEnabledChanged: (enabled: boolean) => void;
  onVolumeChanged: (volume: number) => void;
  onBack: () => void;
}

export function SettingsScreen(props: SettingsProps) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeSettingsScene {...props} />;
  }

  const { musicEnabled, musicVolume, onMusicEnabledChanged, onVolumeChanged, onBack } = props;
  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
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
            height: 156,
            background: 'linear-gradient(to bottom, #000, transparent)',
          }}
        />
        <div style={{ position: 'absolute', left: 20, right: 20, top: 22, height: 44, display: 'flex', alignItems: 'center' }}>
          <RoundControl onClick={onBack} label="Назад">
            ‹
          </RoundControl>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 23,
              letterSpacing: 2.1,
              color: 'var(--gold-bright)',
            }}
          >
            НАСТРОЙКИ
          </div>
          <div style={{ width: 44 }} />
        </div>
        <div style={{ position: 'absolute', top: 200, left: 42, right: 42 }}>
          <MusicSettingsCard
            musicEnabled={musicEnabled}
            musicVolume={musicVolume}
            onMusicEnabledChanged={onMusicEnabledChanged}
            onVolumeChanged={onVolumeChanged}
          />
        </div>
      </div>
    </DesignCanvas>
  );
}

/**
 * Settings layout for horizontal phones: it shares the music card with
 * portrait but gives it the full visual weight of the wide castle scene.
 */
function LandscapeSettingsScene({
  musicEnabled,
  musicVolume,
  onMusicEnabledChanged,
  onVolumeChanged,
  onBack,
}: SettingsProps) {
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
          background: 'radial-gradient(circle at 50% 45%, rgba(0,0,0,0.15), rgba(0,0,0,0.72))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 96,
          right: 96,
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 25,
          letterSpacing: 2.2,
          color: 'var(--gold-bright)',
          pointerEvents: 'none',
        }}
      >
        НАСТРОЙКИ
      </div>
      {/* pointerEvents: 'none' so this full-screen centering wrapper doesn't
          sit on top of (and swallow clicks on) the back button below it —
          only the card itself re-enables pointer events. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ maxWidth: 460, width: '100%', padding: '0 24px', pointerEvents: 'auto' }}>
          <MusicSettingsCard
            musicEnabled={musicEnabled}
            musicVolume={musicVolume}
            onMusicEnabledChanged={onMusicEnabledChanged}
            onVolumeChanged={onVolumeChanged}
          />
        </div>
      </div>
      {/* Same round back control (and size) as the in-game top bar, rendered
          after the centering wrapper above so it's never covered by it. */}
      <div style={{ position: 'absolute', top: 22, left: 20 }}>
        <RoundControl onClick={onBack} label="Назад">
          ‹
        </RoundControl>
      </div>
    </div>
  );
}

/**
 * The shared settings card keeps controls and touch targets identical in
 * portrait and landscape while letting each scene choose its own placement.
 */
function MusicSettingsCard({
  musicEnabled,
  musicVolume,
  onMusicEnabledChanged,
  onVolumeChanged,
}: Pick<SettingsProps, 'musicEnabled' | 'musicVolume' | 'onMusicEnabledChanged' | 'onVolumeChanged'>) {
  return (
    <div
      style={{
        padding: '22px 24px 26px',
        borderRadius: 22,
        background: 'linear-gradient(to bottom, rgba(29,49,103,0.96), rgba(12,23,52,0.96))',
        border: '2px solid #cfa244',
        boxShadow: '0 14px 26px rgba(0,0,0,0.57)',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onMusicEnabledChanged(!musicEnabled)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(18,32,68,0.85)',
            border: '1.7px solid rgba(216,165,55,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gold)',
            fontSize: 20,
          }}
        >
          {/* A plain text glyph (unlike the 🎵 emoji) actually takes the
              gold `color` above instead of rendering as its own full-colour,
              semi-transparent-looking emoji artwork. */}
          ♪
        </div>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 1.1, color: 'var(--gold-bright)' }}>
          Музыка
        </div>
        <RuneToggle value={musicEnabled} onChange={onMusicEnabledChanged} />
      </div>
      <div style={{ height: 26 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: musicEnabled ? '#d8e0f7' : 'rgba(127,140,172,0.4)' }}>
          Громкость
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: musicEnabled ? 'var(--gold)' : 'rgba(127,140,172,0.4)' }}>
          {Math.round(musicVolume * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={musicVolume}
        disabled={!musicEnabled}
        onChange={(e) => onVolumeChanged(Number(e.target.value))}
        style={{ width: '100%', marginTop: 8, accentColor: '#d8a537' }}
      />
    </div>
  );
}

function RuneToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label="Включить музыку"
      onClick={() => onChange(!value)}
      style={{
        width: 56,
        height: 30,
        borderRadius: 15,
        padding: 3,
        border: `1.4px solid ${value ? 'var(--gold)' : '#54608a'}`,
        background: value ? 'linear-gradient(var(--success-a), var(--success-b))' : 'linear-gradient(#17264f, #0b1530)',
        cursor: 'pointer',
        boxShadow: value ? '0 0 10px rgba(62,224,166,0.45)' : 'none',
        display: 'flex',
        justifyContent: value ? 'flex-end' : 'flex-start',
        transition: 'justify-content 180ms',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'block',
          background: 'linear-gradient(135deg, #fff3d0, #ffd779)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      />
    </button>
  );
}
