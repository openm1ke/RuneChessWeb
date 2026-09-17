import type { Strings } from '../l10n/ru';
/** Mostly-neutral nudges — no mention of the streak at all. The bulk of the
 * pool, so a player who never builds a streak still gets a varied,
 * non-repetitive reminder every time. */
/** Mostly-neutral nudges — no mention of the streak at all. The bulk of
 * the pool, so a player who never builds a streak still gets a varied,
 * non-repetitive reminder. */
function neutralReminders(l10n: Strings): string[] {
  return [
    l10n.reminderNeutral1, l10n.reminderNeutral2, l10n.reminderNeutral3,
    l10n.reminderNeutral4, l10n.reminderNeutral5, l10n.reminderNeutral6,
    l10n.reminderNeutral7, l10n.reminderNeutral8, l10n.reminderNeutral9,
    l10n.reminderNeutral10, l10n.reminderNeutral11, l10n.reminderNeutral12,
    l10n.reminderNeutral13, l10n.reminderNeutral14,
  ];
}

/** Shown only once a real streak exists — celebratory, no urgency. Used
 * while a daily freeze is still available, so a missed day wouldn't break
 * anything yet. */
function streakReminders(l10n: Strings, streak: number): string[] {
  const days = l10n.reminderDays(streak);
  return [
    l10n.reminderStreak1(days), l10n.reminderStreak2(days),
    l10n.reminderStreak3(days), l10n.reminderStreak4,
    l10n.reminderStreak5(days),
  ];
}

/** Shown only once the freeze is already spent — a real miss today would
 * break the streak, so the wording is deliberately more urgent. */
function streakRiskReminders(l10n: Strings, streak: number): string[] {
  const days = l10n.reminderDays(streak);
  return [
    l10n.reminderRisk1(days), l10n.reminderRisk2,
    l10n.reminderRisk3(days), l10n.reminderRisk4(days),
    l10n.reminderRisk5(days),
  ];
}

/** Picks one reminder message body, weighted so a plain nudge (see
 * `neutralReminders(l10n)`) is by far the most common, avoiding a repeat of
 * `previous` (the last message actually shown) when the pool allows it.
 *
 * Unlike the mobile app — which schedules a whole batch of OS notifications
 * up to two weeks ahead, each with its own pre-picked text — a browser
 * cannot reliably fire anything while the tab isn't open, so the web
 * reminder instead re-evaluates and picks fresh, one shot at a time, each
 * time the app is opened and a reminder turns out to be due (see
 * `DailyReminderService`). */
export function pickReminderMessage({
  l10n,
  currentStreak,
  freezeAvailable,
  previous,
  random = Math.random,
}: {
  /** The strings to write the reminder in. Passed rather than read from a
   * context: this runs from the reminder service, outside React. */
  l10n: Strings;
  currentStreak: number;
  freezeAvailable: boolean;
  previous?: string | null;
  random?: () => number;
}): string {
  const pool = [
    ...neutralReminders(l10n),
    ...neutralReminders(l10n),
    ...neutralReminders(l10n),
    ...(currentStreak > 0
      ? freezeAvailable
        ? streakReminders(l10n, currentStreak)
        : [...streakRiskReminders(l10n, currentStreak), ...streakRiskReminders(l10n, currentStreak)]
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
