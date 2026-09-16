/**
 * Hands the current language to everything that draws words.
 *
 * A context rather than a prop, for the same reason as `CosmeticSkinContext`:
 * the screens, the overlays and the dialogs are several levels apart and
 * nothing in between cares which language is on. Mirrors `context.l10n` in
 * the Flutter app.
 */
import { createContext, useContext } from 'react';

import { en } from './en';
import { ru, type Strings } from './ru';

export const LANGUAGES = ['ru', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const STRINGS: Record<Language, Strings> = { ru, en };

export function stringsFor(language: Language): Strings {
  return STRINGS[language];
}

export function isLanguage(value: string | null | undefined): value is Language {
  return LANGUAGES.includes(value as Language);
}

/**
 * Russian is the default here rather than English, unlike the mobile app.
 *
 * The site is runechess.ru and the catalogue build runs inside Yandex
 * Games, so a visitor who arrives with nothing to go on is far more likely
 * to read Russian. English is still what an English browser gets — it is
 * the fallback for *unknown* languages, not the default for absent ones.
 */
export const L10nContext = createContext<Strings>(ru);

export function useL10n(): Strings {
  return useContext(L10nContext);
}
