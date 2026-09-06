import { useMemo, useState } from 'react';
import { dailyChallengeKey, type DailyChallengeResult } from '../../game/dailyChallengeLevels';
import {
  computeDailyChallengeStats,
  dayWord,
  daysUntilFreezeRefill,
  formatDurationShort,
  timeUntilNextDailyChallenge,
} from '../../game/dailyChallengeStats';
import { asset } from '../../lib/assetUrl';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAY_LETTERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const SOLVED_FILL = '#3a6b3f';
const FROZEN_FILL = '#1e4a66';
const MISSED_FILL = 'rgba(255,255,255,0.12)';
const ICE = '#7fe0ff';
const GOLD = '#ffd77a';
const MUTED = 'rgba(206,225,255,0.6)';

/**
 * The streak screen of the daily challenge — a port of the mobile app's
 * `DailyChallengeCalendarDialog`, rebuilt together with it.
 *
 * It is ordered by what the player came for. That used to be upside down: a
 * 56px snowflake and the word "Дейли-фриз" opened the card, and the streak —
 * the only number the mode is actually about — was the fourth line at 15px.
 * The freeze is insurance for the streak, so it reads as a status line under
 * it now.
 *
 * The wording changed with it: "Дейли-фриз заработан" appeared over a streak
 * of 0 for a player who had never played, right under "Пройдите 7 дней
 * подряд, чтобы получить фриз" — the freeze is granted up front (see
 * `computeDailyChallengeStats`), so the card both claimed it was earned and
 * asked for seven days to earn it.
 */
export function DailyChallengeCalendarSheet({
  history,
  onClose,
}: {
  history: Map<string, DailyChallengeResult>;
  onClose: () => void;
}) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const stats = useMemo(() => computeDailyChallengeStats({ history, today }), [history, today]);
  const leftToday = useMemo(() => timeUntilNextDailyChallenge(new Date()), []);

  const shiftMonth = (delta: number) =>
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-calendar-title"
      style={{ position: 'fixed', zIndex: 30, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(380px, 100%)',
          // Landscape phones are the case this exists for: the card is taller
          // than the viewport, and without a cap the month grid ran off the
          // bottom with the close control somewhere past it.
          maxHeight: 'calc(100dvh - 48px)',
          overflowY: 'auto',
          padding: '18px 20px',
          borderRadius: 18,
          border: '2px solid #cf9c3c',
          background: 'linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))',
          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
          textAlign: 'center',
        }}
      >
        {/* Pinned, so it stays reachable once the month scrolls; the disc is
            what keeps it readable with the grid passing underneath. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            position: 'sticky',
            top: 0,
            float: 'right',
            width: 40,
            height: 40,
            marginRight: -8,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(30,48,104,0.94)',
            color: 'rgba(255,226,164,0.72)',
            fontSize: 22,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <StreakHeadline streak={stats.currentStreak} />
        <div style={{ height: 12 }} />
        <FreezeStatus available={stats.freezeAvailable} streak={stats.currentStreak} />
        <div style={{ height: 10 }} />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
          Новое задание через {formatDurationShort(leftToday)}
        </div>
        <div style={{ height: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц" style={monthArrowStyle}>
            ‹
          </button>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ffe2a4' }}>
            {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Следующий месяц" style={monthArrowStyle}>
            ›
          </button>
        </div>
        <div style={{ height: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {WEEKDAY_LETTERS.map((letter) => (
            <div key={letter} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(206,225,255,0.5)', textAlign: 'center' }}>
              {letter}
            </div>
          ))}
        </div>
        <div style={{ height: 4 }} />
        <MonthGrid visibleMonth={visibleMonth} today={today} history={history} frozenDates={stats.frozenDates} />
        <div style={{ height: 12 }} />
        <Legend />
      </div>
    </div>
  );
}

/** The number the mode is about, at the size that says so. */
function StreakHeadline({ streak }: { streak: number }) {
  if (streak === 0) {
    // A giant "0" is a scoreboard of failure. With nothing to count yet, the
    // honest headline is the invitation.
    return (
      <div style={{ padding: '0 36px' }}>
        <div id="daily-calendar-title" style={{ fontSize: 19, fontWeight: 900, color: GOLD }}>
          Серия ещё не начата
        </div>
        <div style={{ height: 4 }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>
          Решите сегодняшнее задание, чтобы начать
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '0 36px' }}>
      <div id="daily-calendar-title" style={{ fontSize: 46, fontWeight: 900, color: GOLD, lineHeight: 1.05 }}>
        {streak}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,226,164,0.8)', letterSpacing: 0.6 }}>
        {dayWord(streak)} подряд
      </div>
    </div>
  );
}

/** The freeze, as a status line rather than the headline it used to be. */
function FreezeStatus({ available, streak }: { available: boolean; streak: number }) {
  const refillIn = daysUntilFreezeRefill(streak);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        textAlign: 'left',
        padding: '9px 12px 10px',
        borderRadius: 12,
        background: 'rgba(127,224,255,0.12)',
        border: `1px solid ${available ? 'rgba(127,224,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
      }}
    >
      <img
        src={asset('assets/images/daily-freeze-snowflake.webp')}
        alt=""
        width={26}
        height={26}
        style={{ opacity: available ? 1 : 0.35, flexShrink: 0 }}
        draggable={false}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: available ? ICE : 'rgba(206,225,255,0.55)' }}>
          {available ? 'Фриз в запасе' : 'Фриз использован'}
        </div>
        <div style={{ height: 2 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>
          {/* What it does, not how it is obtained: the old line ("Пройдите 7
              дней подряд, чтобы получить фриз") was shown to players who
              already had one. */}
          {available
            ? 'Один пропущенный день не обнулит серию'
            : `Вернётся ещё через ${refillIn} ${dayWord(refillIn)} подряд`}
        </div>
      </div>
    </div>
  );
}

/** Four cell states with no key at all left the player to guess which grey
 * meant "missed" — and the month before install is all greys, which reads as
 * an accusation. */
function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 12px' }}>
      <LegendItem fill={SOLVED_FILL} label="пройден">
        <span style={{ fontSize: 9, color: GOLD }}>★</span>
      </LegendItem>
      <LegendItem fill={FROZEN_FILL} label="прощён фризом">
        <span style={{ fontSize: 9, color: ICE }}>❄</span>
      </LegendItem>
      <LegendItem fill={MISSED_FILL} label="пропущен" />
    </div>
  );
}

function LegendItem({ fill, label, children }: { fill: string; label: string; children?: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: fill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: MUTED }}>{label}</span>
    </span>
  );
}

const monthArrowStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: GOLD,
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 6,
};

function MonthGrid({
  visibleMonth,
  today,
  history,
  frozenDates,
}: {
  visibleMonth: Date;
  today: Date;
  history: Map<string, DailyChallengeResult>;
  frozenDates: Set<string>;
}) {
  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  // JS `getDay()`: Sunday=0..Saturday=6 — remap so Monday leads the grid,
  // matching the Пн-first header.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
      {Array.from({ length: leadingBlanks }, (_, i) => (
        <div key={`blank-${i}`} />
      ))}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
        return <DayCell key={day} date={date} today={today} history={history} frozenDates={frozenDates} />;
      })}
    </div>
  );
}

function DayCell({
  date,
  today,
  history,
  frozenDates,
}: {
  date: Date;
  today: Date;
  history: Map<string, DailyChallengeResult>;
  frozenDates: Set<string>;
}) {
  const key = dailyChallengeKey(date);
  const result = history.get(key);
  const frozen = frozenDates.has(key);
  const isFuture = date.getTime() > today.getTime();
  const isToday = date.getTime() === today.getTime();

  let background = MISSED_FILL;
  let textColor = 'rgba(206,225,255,0.5)';
  let mark: React.ReactNode = null;
  let label = 'пропущен';
  if (result != null) {
    background = SOLVED_FILL;
    textColor = '#e9ffea';
    label = `пройден, звёзд: ${result.stars}`;
    mark = (
      <div style={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        {/* 10, not the 8 this used to be: three tiny stars merged into one
            smudge and could not be told apart from one. */}
        {Array.from({ length: result.stars }, (_, i) => (
          <span key={i} style={{ fontSize: 10, color: GOLD, lineHeight: 1 }}>
            ★
          </span>
        ))}
      </div>
    );
  } else if (frozen) {
    background = FROZEN_FILL;
    textColor = '#dff4ff';
    label = 'пропущен, прощён фризом';
    mark = <span style={{ fontSize: 11, color: ICE, lineHeight: 1 }}>❄</span>;
  } else if (isFuture) {
    background = 'transparent';
    textColor = 'rgba(206,225,255,0.3)';
    label = 'ещё не наступил';
  }

  return (
    <div
      aria-label={`${date.getDate()} ${MONTH_NAMES[date.getMonth()].toLowerCase()} — ${label}`}
      style={{
        aspectRatio: '1',
        borderRadius: 8,
        background,
        border: isToday ? '1.4px solid #ffd77a' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{date.getDate()}</span>
      {mark}
    </div>
  );
}
