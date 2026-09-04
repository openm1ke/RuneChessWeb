import { RoundControl } from '../shared/RoundControl';

/** A rounded lightbulb outline — a hand-drawn stand-in for the mobile app's
 * `Icons.lightbulb_outline_rounded`, since the web build has no icon font.
 * Deliberately not the 💡 emoji, for the same reason as `CalendarIcon`:
 * full-colour, padded, off-brand next to this app's flat gold controls. */
function LightbulbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17.5h6" />
      <path d="M9.75 20.25h4.5" />
      <path d="M12 2.75a6.25 6.25 0 0 0-3.5 11.42c.62.42 1 1.13 1 1.9v.63h5v-.63c0-.77.38-1.48 1-1.9A6.25 6.25 0 0 0 12 2.75Z" />
    </svg>
  );
}

/** A plain calendar-page glyph, styled to match the app's other round
 * controls (monochrome, inherits `currentColor`) — the mobile app uses
 * Material's `Icons.calendar_month_rounded` here; this is a hand-drawn
 * equivalent since the web build has no icon font. Deliberately not the 📅
 * emoji: browsers render that as a full-colour glyph with a lot of built-in
 * padding baked into the character itself, which read as both
 * off-brand and too small inside the round button. */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.25" y="4.75" width="17.5" height="15.5" rx="2.75" />
      <path d="M3.25 9.5h17.5" />
      <path d="M8 3v3.25" />
      <path d="M16 3v3.25" />
      <circle cx="8" cy="13.5" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.5" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13.5" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TopControls({
  onBack,
  onHint,
  hintEnabled = true,
  onCalendar,
}: {
  onBack: () => void;
  onHint: () => void;
  hintEnabled?: boolean;
  /** Only present while playing the daily challenge — opens the streak
   * calendar. Stacked below the hint button rather than beside it, so it
   * never competes for space with a longer hint-button row. */
  onCalendar?: () => void;
}) {
  return (
    <div style={{ position: 'absolute', top: 22, left: 20, right: 20, display: 'flex', justifyContent: 'space-between' }}>
      <RoundControl onClick={onBack} label="Назад">
        ‹
      </RoundControl>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <RoundControl onClick={onHint} disabled={!hintEnabled} label="Подсказка">
          <LightbulbIcon />
        </RoundControl>
        {onCalendar && (
          <RoundControl onClick={onCalendar} label="Календарь заданий дня">
            <CalendarIcon />
          </RoundControl>
        )}
      </div>
    </div>
  );
}

export function TopStatus({
  done,
  total,
  level,
  label,
}: {
  done: number;
  total: number;
  level: number;
  /** Overrides the default "УРОВЕНЬ {level}" text — used for the daily
   * challenge, which has no meaningful level number of its own. */
  label?: string;
}) {
  return (
    <div style={{ position: 'absolute', top: 25, left: 76, right: 76, height: 40, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(9,16,38,0.5)',
          border: '1px solid rgba(224,168,63,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.1, color: 'rgba(206,225,255,0.84)' }}>
          {label ?? `УРОВЕНЬ ${level}`}
        </span>
        <span style={{ width: 1, height: 14, background: 'rgba(224,168,63,0.4)' }} />
        <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>
          {done} / {total}
        </span>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: 'rgba(206,225,255,0.78)' }}>
          МОНЕТЫ
        </span>
      </div>
    </div>
  );
}

export function BottomUtilityControls({
  onReset,
  onSkip,
  onResetOnboarding,
  showSkip,
}: {
  onReset: () => void;
  onSkip?: () => void;
  onResetOnboarding?: () => void;
  showSkip: boolean;
}) {
  return (
    <div style={{ position: 'absolute', left: 28, bottom: 122, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {showSkip && onSkip && (
        <RoundControl onClick={onSkip} onLongPress={onResetOnboarding} size={34} label="Пропустить уровень (разработка)">
          ⏭
        </RoundControl>
      )}
      <RoundControl onClick={onReset} size={38} label="Начать уровень заново">
        ↻
      </RoundControl>
    </div>
  );
}
