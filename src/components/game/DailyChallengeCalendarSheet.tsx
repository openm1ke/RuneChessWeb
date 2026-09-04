import { useMemo, useState } from 'react';
import { dailyChallengeKey, type DailyChallengeResult } from '../../game/dailyChallengeLevels';
import { computeDailyChallengeStats } from '../../game/dailyChallengeStats';
import { asset } from '../../lib/assetUrl';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAY_LETTERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function dayWord(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

/** Opens the daily-challenge calendar: streak, freeze state, and a month
 * grid marking solved/frozen/missed days — a port of the mobile app's
 * `DailyChallengeCalendarDialog`. */
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
          width: 'min(380px, 100%)',
          padding: '22px 20px 16px',
          borderRadius: 18,
          border: '2px solid #cf9c3c',
          background: 'linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))',
          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
          textAlign: 'center',
        }}
      >
        <img
          src={asset('assets/images/daily-freeze-snowflake.webp')}
          alt=""
          width={56}
          height={56}
          style={{ opacity: stats.freezeAvailable ? 1 : 0.35, margin: '0 auto' }}
          draggable={false}
        />
        <div style={{ height: 6 }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: stats.freezeAvailable ? '#7fe0ff' : 'rgba(206,225,255,0.55)' }}>
          {stats.freezeAvailable ? 'Дейли-фриз заработан' : 'Дейли-фриз использован'}
        </div>
        <div style={{ height: 2 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(206,225,255,0.6)' }}>
          Пройдите 7 дней подряд, чтобы получить фриз
        </div>
        <div style={{ height: 14 }} />
        <div id="daily-calendar-title" style={{ fontSize: 15, fontWeight: 900, color: '#ffd77a' }}>
          Текущий стрик: {stats.currentStreak} {dayWord(stats.currentStreak)}
        </div>
        <div style={{ height: 12 }} />
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
        <div style={{ height: 8 }} />
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#ffd77a', fontWeight: 900, fontSize: 14, cursor: 'pointer', padding: 8 }}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

const monthArrowStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#ffd77a',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 4,
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
  const solved = result != null;
  const frozen = frozenDates.has(key);
  const isFuture = date.getTime() > today.getTime();
  const isToday = date.getTime() === today.getTime();

  let background = 'rgba(255,255,255,0.12)';
  let textColor = 'rgba(206,225,255,0.5)';
  let mark: React.ReactNode = null;
  if (solved) {
    background = '#3a6b3f';
    textColor = '#e9ffea';
    mark = (
      <div style={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        {Array.from({ length: result.stars }, (_, i) => (
          <span key={i} style={{ fontSize: 8, color: '#ffd77a' }}>
            ★
          </span>
        ))}
      </div>
    );
  } else if (frozen) {
    background = '#1e4a66';
    textColor = '#dff4ff';
    mark = <span style={{ fontSize: 11, color: '#7fe0ff' }}>❄</span>;
  } else if (isFuture) {
    background = 'transparent';
    textColor = 'rgba(206,225,255,0.3)';
  }

  return (
    <div
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
