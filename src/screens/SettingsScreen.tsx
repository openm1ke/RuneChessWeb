import { useState } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { RoundControl } from '../components/shared/RoundControl';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';

interface SettingsProps {
  musicEnabled: boolean;
  musicVolume: number;
  onMusicEnabledChanged: (enabled: boolean) => void;
  onVolumeChanged: (volume: number) => void;
  soundEffectsEnabled: boolean;
  onSoundEffectsEnabledChanged: (enabled: boolean) => void;
  onProgressReset: () => void;
  onBack: () => void;
}

export function SettingsScreen(props: SettingsProps) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;
  const [confirmingReset, setConfirmingReset] = useState(false);

  const scene = isLandscape ? (
    <LandscapeSettingsScene {...props} onResetRequested={() => setConfirmingReset(true)} />
  ) : (
    <PortraitSettingsScene {...props} onResetRequested={() => setConfirmingReset(true)} />
  );

  return (
    <>
      {scene}
      {confirmingReset && (
        <ResetProgressConfirmation
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setConfirmingReset(false);
            props.onProgressReset();
          }}
        />
      )}
    </>
  );
}

function PortraitSettingsScene({
  musicEnabled,
  musicVolume,
  onMusicEnabledChanged,
  onVolumeChanged,
  soundEffectsEnabled,
  onSoundEffectsEnabledChanged,
  onBack,
  onResetRequested,
}: SettingsProps & { onResetRequested: () => void }) {
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
            soundEffectsEnabled={soundEffectsEnabled}
            onSoundEffectsEnabledChanged={onSoundEffectsEnabledChanged}
            onResetRequested={onResetRequested}
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
  soundEffectsEnabled,
  onSoundEffectsEnabledChanged,
  onBack,
  onResetRequested,
}: SettingsProps & { onResetRequested: () => void }) {
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
            soundEffectsEnabled={soundEffectsEnabled}
            onSoundEffectsEnabledChanged={onSoundEffectsEnabledChanged}
            onResetRequested={onResetRequested}
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
  soundEffectsEnabled,
  onSoundEffectsEnabledChanged,
  onResetRequested,
}: Pick<
  SettingsProps,
  'musicEnabled' | 'musicVolume' | 'onMusicEnabledChanged' | 'onVolumeChanged' | 'soundEffectsEnabled' | 'onSoundEffectsEnabledChanged'
> & { onResetRequested: () => void }) {
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
        <RuneToggle value={musicEnabled} onChange={onMusicEnabledChanged} label="Включить музыку" />
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
      <div style={{ height: 22, marginTop: 22, borderTop: '1px solid rgba(207,162,68,0.38)' }} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSoundEffectsEnabledChanged(!soundEffectsEnabled)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginTop: 20 }}
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
            fontSize: 18,
          }}
        >
          🔔
        </div>
        <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 1.1, color: 'var(--gold-bright)' }}>
          Звуковые эффекты
        </div>
        <RuneToggle value={soundEffectsEnabled} onChange={onSoundEffectsEnabledChanged} label="Включить звуковые эффекты" />
      </div>
      <div style={{ height: 24, marginTop: 26, borderTop: '1px solid rgba(207,162,68,0.38)' }} />
      <div style={{ color: '#f4d8a1', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 0.8 }}>СБРОС ПРОГРЕССА</div>
      <p style={{ margin: '8px 0 15px', color: '#c6d3ed', fontSize: 13, fontWeight: 700, lineHeight: 1.42 }}>
        Удалить пройденные уровни и звёзды.
      </p>
      <button
        type="button"
        onClick={onResetRequested}
        style={{ width: '100%', minHeight: 44, border: '1.5px solid rgba(240,142,104,0.86)', borderRadius: 12, color: '#ffe2d7', background: 'linear-gradient(#77323b, #451d2b)', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 1, cursor: 'pointer' }}
      >
        СБРОСИТЬ ДОСТИЖЕНИЯ
      </button>
    </div>
  );
}

function ResetProgressConfirmation({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-progress-title"
      style={{ position: 'fixed', zIndex: 20, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(1,4,14,0.79)' }}
    >
      <div style={{ width: 'min(390px, 100%)', padding: '26px 24px 22px', border: '2px solid #d0a344', borderRadius: 22, background: 'linear-gradient(145deg, #203c7b, #0b1637)', boxShadow: '0 20px 60px rgba(0,0,0,0.72)', textAlign: 'center' }}>
        <h2 id="reset-progress-title" style={{ margin: 0, color: 'var(--gold-bright)', fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 1.1 }}>
          СБРОСИТЬ ПРОГРЕСС?
        </h2>
        <p style={{ margin: '14px 0 22px', color: '#d9e4f8', fontSize: 15, fontWeight: 700, lineHeight: 1.45 }}>
          Пройденные уровни и звёзды будут удалены. Это действие нельзя отменить.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={confirmationButtonStyle(false)}>ОТМЕНА</button>
          <button type="button" onClick={onConfirm} style={confirmationButtonStyle(true)}>СБРОСИТЬ</button>
        </div>
      </div>
    </div>
  );
}

function confirmationButtonStyle(danger: boolean) {
  return {
    flex: 1,
    minHeight: 44,
    border: danger ? '1.5px solid rgba(240,142,104,0.86)' : '1.5px solid rgba(207,162,68,0.76)',
    borderRadius: 12,
    color: danger ? '#ffe2d7' : '#ffe6b0',
    background: danger ? 'linear-gradient(#77323b, #451d2b)' : 'linear-gradient(#294781, #182852)',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    letterSpacing: 0.8,
    cursor: 'pointer',
  } as const;
}

function RuneToggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
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
