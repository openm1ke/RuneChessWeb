import { useState } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { RoundControl } from '../components/shared/RoundControl';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';
import { formatHourWindow } from '../services/dailyReminderMessages';

interface SettingsProps {
  musicEnabled: boolean;
  musicVolume: number;
  onMusicEnabledChanged: (enabled: boolean) => void;
  onVolumeChanged: (volume: number) => void;
  soundEffectsEnabled: boolean;
  onSoundEffectsEnabledChanged: (enabled: boolean) => void;
  onProgressReset: () => void;
  onBack: () => void;
  /** Reminders are an independent local consent from music/sound — see
   * `DailyReminderCard` and `ProgressRepository`'s daily-reminder keys. */
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  onDailyReminderEnabledChanged: (enabled: boolean) => void;
  onDailyReminderHourChanged: (hour: number) => void;
  /** Null while the player has not answered the consent banner yet. */
  analyticsConsent: boolean | null;
  onAnalyticsConsentChanged: (consent: boolean) => void;
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
  dailyReminderEnabled,
  dailyReminderHour,
  onDailyReminderEnabledChanged,
  onDailyReminderHourChanged,
  analyticsConsent,
  onAnalyticsConsentChanged,
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
        {/* The title scrolls away with the cards instead of sitting in a
            pinned header, so nothing ever gets clipped at a fixed boundary
            — only the back button stays pinned, floating above the
            scrolling content. */}
        <div
          className="dozor-scroll-panel"
          style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '78px 42px 32px' }}
        >
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 23,
              letterSpacing: 2.1,
              color: 'var(--gold-bright)',
              marginBottom: 26,
            }}
          >
            НАСТРОЙКИ
          </div>
          <MusicSettingsCard
            musicEnabled={musicEnabled}
            musicVolume={musicVolume}
            onMusicEnabledChanged={onMusicEnabledChanged}
            onVolumeChanged={onVolumeChanged}
            soundEffectsEnabled={soundEffectsEnabled}
            onSoundEffectsEnabledChanged={onSoundEffectsEnabledChanged}
          />
          <div style={{ height: 20 }} />
          <DailyReminderCard
            enabled={dailyReminderEnabled}
            hour={dailyReminderHour}
            onEnabledChanged={onDailyReminderEnabledChanged}
            onHourChanged={onDailyReminderHourChanged}
          />
          <div style={{ height: 20 }} />
          <PrivacyCard
            analyticsConsent={analyticsConsent}
            onAnalyticsConsentChanged={onAnalyticsConsentChanged}
          />
          <div style={{ height: 20 }} />
          <ResetProgressCard onResetRequested={onResetRequested} />
        </div>
        <div style={{ position: 'absolute', left: 20, top: 22 }}>
          <RoundControl onClick={onBack} label="Назад">
            ‹
          </RoundControl>
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
  dailyReminderEnabled,
  dailyReminderHour,
  onDailyReminderEnabledChanged,
  onDailyReminderHourChanged,
  analyticsConsent,
  onAnalyticsConsentChanged,
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
      {/* The title scrolls away with the cards instead of sitting in a
          pinned header, so nothing ever gets clipped at a fixed boundary —
          only the back button stays pinned, floating above the scrolling
          content. */}
      <div
        className="dozor-scroll-panel"
        style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}
      >
        <div style={{ maxWidth: 460, width: '100%', padding: '78px 24px 24px' }}>
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 25,
              letterSpacing: 2.2,
              color: 'var(--gold-bright)',
              marginBottom: 22,
            }}
          >
            НАСТРОЙКИ
          </div>
          <MusicSettingsCard
            musicEnabled={musicEnabled}
            musicVolume={musicVolume}
            onMusicEnabledChanged={onMusicEnabledChanged}
            onVolumeChanged={onVolumeChanged}
            soundEffectsEnabled={soundEffectsEnabled}
            onSoundEffectsEnabledChanged={onSoundEffectsEnabledChanged}
          />
          <div style={{ height: 18 }} />
          <DailyReminderCard
            enabled={dailyReminderEnabled}
            hour={dailyReminderHour}
            onEnabledChanged={onDailyReminderEnabledChanged}
            onHourChanged={onDailyReminderHourChanged}
          />
          <div style={{ height: 18 }} />
          <PrivacyCard
            analyticsConsent={analyticsConsent}
            onAnalyticsConsentChanged={onAnalyticsConsentChanged}
          />
          <div style={{ height: 18 }} />
          <ResetProgressCard onResetRequested={onResetRequested} />
        </div>
      </div>
      {/* Rendered after the scroll container above so it's never covered by
          it. */}
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
}: Pick<
  SettingsProps,
  'musicEnabled' | 'musicVolume' | 'onMusicEnabledChanged' | 'onVolumeChanged' | 'soundEffectsEnabled' | 'onSoundEffectsEnabledChanged'
>) {
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
    </div>
  );
}

const SETTINGS_CARD_STYLE = {
  padding: '22px 24px 26px',
  borderRadius: 22,
  background: 'linear-gradient(to bottom, rgba(29,49,103,0.96), rgba(12,23,52,0.96))',
  border: '2px solid #cfa244',
  boxShadow: '0 14px 26px rgba(0,0,0,0.57)',
} as const;

/**
 * Deliberately last on the settings page, separate from `MusicSettingsCard`
 * — a destructive, irreversible action shouldn't share a card with everyday
 * toggles, and putting it at the very bottom keeps it out of the way of
 * controls players actually adjust often.
 */
function ResetProgressCard({ onResetRequested }: { onResetRequested: () => void }) {
  return (
    <div style={SETTINGS_CARD_STYLE}>
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

/** The analytics consent, changeable at any time.
 *
 * There was no way back before this card existed: the banner asked once, and
 * `AnalyticsService.enable()` was one-way, so a player who changed their mind
 * had only a button buried in privacy.html — which took effect on the next
 * page load and nowhere told them so. The privacy page even promised a
 * "Настройки → Конфиденциальность" section that the web build did not have.
 * Withdrawing has to be as easy as granting. */
function PrivacyCard({
  analyticsConsent,
  onAnalyticsConsentChanged,
}: {
  analyticsConsent: boolean | null;
  onAnalyticsConsentChanged: (consent: boolean) => void;
}) {
  return (
    <div style={SETTINGS_CARD_STYLE}>
      <div style={{ color: '#f4d8a1', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 0.8 }}>
        КОНФИДЕНЦИАЛЬНОСТЬ
      </div>
      <div style={{ height: 16 }} />
      <div
        style={{
          padding: '14px 14px 14px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.12)',
          border: '1.2px solid rgba(207,162,68,0.35)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 0.4, color: 'var(--gold-bright)' }}>
            Аналитика
          </div>
          <div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.4, fontWeight: 700, color: '#c6d3ed' }}>
            Помогать улучшать игру: отправлять обезличенные сведения об использовании уровней и функций.
          </div>
        </div>
        <RuneToggle
          value={analyticsConsent === true}
          onChange={onAnalyticsConsentChanged}
          label="Аналитика"
        />
      </div>
    </div>
  );
}

/** A local "wake me up" consent, independent of the analytics/ads consent —
 * exposes a toggle plus an hourly picker that only appears once enabled,
 * since picking a time for a reminder that won't fire is meaningless
 * clutter. See `dailyReminderService.ts` for what actually happens once
 * this is on. */
function DailyReminderCard({
  enabled,
  hour,
  onEnabledChanged,
  onHourChanged,
}: {
  enabled: boolean;
  hour: number;
  onEnabledChanged: (enabled: boolean) => void;
  onHourChanged: (hour: number) => void;
}) {
  return (
    <div style={SETTINGS_CARD_STYLE}>
      <div style={{ color: '#f4d8a1', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 0.8 }}>ЗАДАНИЕ ДНЯ</div>
      <div style={{ height: 16 }} />
      <div
        style={{
          padding: '14px 14px 14px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.12)',
          border: '1.2px solid rgba(207,162,68,0.35)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 0.4, color: 'var(--gold-bright)' }}>
            Напоминать о задании дня
          </div>
          <div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.4, fontWeight: 700, color: '#c6d3ed' }}>
            Уведомление в браузере, если сегодняшнее задание ещё не решено. Придёт где-то внутри выбранного окна, пока вкладка открыта.
          </div>
        </div>
        <RuneToggle value={enabled} onChange={onEnabledChanged} label="Напоминать о задании дня" />
      </div>
      {enabled && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#d6e4ff' }}>Окно напоминания</span>
          <select
            value={hour}
            onChange={(e) => onHourChanged(Number(e.target.value))}
            aria-label="Окно напоминания"
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '1.2px solid rgba(207,162,68,0.6)',
              background: 'rgba(10,16,34,0.6)',
              color: 'var(--gold-bright)',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {REMINDER_HOURS.map((h) => (
              <option key={h} value={h} style={{ background: '#0b1530', color: '#ffe2a4' }}>
                {formatHourWindow(h)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** Hourly picker, 08:00 through 22:00 — the earlier/later hours of the day
 * are rarely useful for a "did you play today" nudge, so the range is
 * deliberately narrower than the full 0-23. Entries render as windows
 * ("13:00 – 14:00") via `formatHourWindow`; the stored value stays the hour
 * the window opens, matching the mobile app. */
const REMINDER_HOURS = Array.from({ length: 15 }, (_, i) => 8 + i);

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
