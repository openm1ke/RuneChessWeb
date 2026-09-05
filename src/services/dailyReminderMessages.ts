/** Mostly-neutral nudges — no mention of the streak at all. The bulk of the
 * pool, so a player who never builds a streak still gets a varied,
 * non-repetitive reminder every time. */
const NEUTRAL_REMINDERS = [
  'Задание дня уже готово — загляните ✨',
  'Ежедневное задание ждёт вас',
  'Новая головоломка дня уже здесь',
  'Сегодняшний паззл ещё не решён',
  'Рунная головоломка дня открыта',
  'Сегодня на доске новая задача',
  'Пять минут — и головоломка дня решена',
  'Соберите руны дня, пока не поздно',
  'Ваш ход — задание дня на месте',
  'Заскучали? Загляните в RuneChess',
  'Новый день — новая партия',
  'Доска ждёт своего мастера',
  'Ещё одна головоломка ждёт решения',
  'RuneChess: свежая загадка дня',
];

/** Shown only once a real streak exists — celebratory, no urgency. Used
 * while a daily freeze is still available, so a missed day wouldn't break
 * anything yet. */
function streakReminders(streak: number): string[] {
  return [
    `Вы на стрике ${streak} ${dayWord(streak)} — не прерывайте!`,
    `${streak} ${dayWord(streak)} подряд — впечатляюще. Продолжайте в том же духе!`,
    `Стрик ${streak} ${dayWord(streak)} держится крепко — так держать!`,
    'Ещё один день — и стрик станет ещё длиннее',
    `${streak} ${dayWord(streak)} подряд! Загляните, чтобы не сбавлять темп`,
  ];
}

/** Shown only once the freeze is already spent — a real miss today would
 * break the streak, so the wording is deliberately more urgent. */
function streakRiskReminders(streak: number): string[] {
  return [
    `Стрик из ${streak} ${dayWord(streak)} может прерваться сегодня!`,
    'Не потеряйте стрик — дейли-фриз уже использован',
    `Сегодня решающий день для стрика в ${streak} ${dayWord(streak)}`,
    `Фриз потрачен — стрик ${streak} ${dayWord(streak)} под угрозой`,
    `Ещё чуть-чуть, и ${streak} ${dayWord(streak)} обнулятся — успейте сыграть`,
  ];
}

function dayWord(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

/** Picks one reminder message body, weighted so a plain nudge (see
 * `NEUTRAL_REMINDERS`) is by far the most common, avoiding a repeat of
 * `previous` (the last message actually shown) when the pool allows it.
 *
 * Unlike the mobile app — which schedules a whole batch of OS notifications
 * up to two weeks ahead, each with its own pre-picked text — a browser
 * cannot reliably fire anything while the tab isn't open, so the web
 * reminder instead re-evaluates and picks fresh, one shot at a time, each
 * time the app is opened and a reminder turns out to be due (see
 * `DailyReminderService`). */
export function pickReminderMessage({
  currentStreak,
  freezeAvailable,
  previous,
  random = Math.random,
}: {
  currentStreak: number;
  freezeAvailable: boolean;
  previous?: string | null;
  random?: () => number;
}): string {
  const pool = [
    ...NEUTRAL_REMINDERS,
    ...NEUTRAL_REMINDERS,
    ...NEUTRAL_REMINDERS,
    ...(currentStreak > 0
      ? freezeAvailable
        ? streakReminders(currentStreak)
        : [...streakRiskReminders(currentStreak), ...streakRiskReminders(currentStreak)]
      : []),
  ];

  let next = pool[Math.floor(random() * pool.length)];
  if (previous != null && new Set(pool).size > 1) {
    let attempts = 0;
    while (next === previous && attempts < 20) {
      next = pool[Math.floor(random() * pool.length)];
      attempts++;
    }
  }
  return next;
}

/**
 * Renders an hour as the interval it opens ("13:00 – 14:00").
 *
 * The picker deliberately never shows a bare "13:00". A reminder here fires
 * from a 15-minute poll that only runs while the tab is open (see
 * `DailyReminderService.startWatching`), and the mobile app's equivalent
 * rides an inexact OS alarm the system gives a full hour of slack. Neither
 * can hit a stated minute, so both offer windows and both keep storing the
 * hour the window opens.
 */
export function formatHourWindow(hour: number): string {
  const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return `${pad(hour)} – ${pad((hour + 1) % 24)}`;
}
