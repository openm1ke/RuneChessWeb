import type { Strings } from './ru';

/** Abbreviated, and matching the mobile app's `_dailyMonthAbbreviations`
 * exactly. The full genitive form ("5 сентября") made the header pill wide
 * enough to run under the back and hint buttons flanking it. */
const dailyDateMonths = (l10n: Strings) => [
  l10n.monthShort1, l10n.monthShort2, l10n.monthShort3, l10n.monthShort4,
  l10n.monthShort5, l10n.monthShort6, l10n.monthShort7, l10n.monthShort8,
  l10n.monthShort9, l10n.monthShort10, l10n.monthShort11, l10n.monthShort12,
];

/** Short "4 СЕН" label for a daily challenge's day.
 *
 * Lives here rather than beside its callers because both the in-game
 * header and the menu ask for it, and a date spelled two ways in one app
 * is the sort of thing nobody notices until a player does. */
export function dailyDateLabel(l10n: Strings, date: Date): string {
  return `${date.getDate()} ${dailyDateMonths(l10n)[date.getMonth()]}`;
}
