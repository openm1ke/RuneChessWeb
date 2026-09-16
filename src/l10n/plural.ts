/**
 * The plural forms the two languages need.
 *
 * Russian has four where English has two — «1 звезда», «2 звезды»,
 * «5 звёзд», and the teens are their own trap: 11 through 14 take the same
 * form as 5 even though they end in 1 through 4. Writing that rule out once
 * here is the whole reason this file exists; the Flutter app gets it from
 * ICU, which this mirrors.
 */

export interface RussianForms {
  /** 1, 21, 31 — but not 11. */
  readonly one: string;
  /** 2-4, 22-24 — but not 12-14. */
  readonly few: string;
  /** 0, 5-20, and everything ending in 11-14. */
  readonly many: string;
}

export function pluralRu(count: number, forms: RussianForms): string {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms.many;
  const mod10 = abs % 10;
  if (mod10 === 1) return forms.one;
  if (mod10 >= 2 && mod10 <= 4) return forms.few;
  return forms.many;
}

export function pluralEn(count: number, one: string, other: string): string {
  return Math.abs(count) === 1 ? one : other;
}
