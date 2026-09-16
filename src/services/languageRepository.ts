/**
 * Which language the player reads the game in, and where that answer comes
 * from when they have not given one.
 *
 * Its own module rather than another field on `ProgressRepository`: that
 * one is about what the player has done, and a language is not progress.
 * Mirrors `LanguageRepository` in the Flutter app.
 */
import { isLanguage, type Language } from '../l10n/l10nContext';

const STORAGE_KEY = 'runechess.language';

/** The player's own choice, or null while they have not made one. */
export function loadLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // A value that is no longer one of ours — a language dropped from a
    // later build, or something else writing to this key — falls back to
    // detection rather than to a language the app cannot draw.
    return isLanguage(stored) ? stored : null;
  } catch {
    // Private mode, blocked storage. Detection still works.
    return null;
  }
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The choice is lost on reload, which is better than a crash on a
    // browser that refuses storage.
  }
}

/**
 * The language to start in.
 *
 * In order: the player's own choice, then whatever the platform or the
 * browser asks for, then Russian.
 *
 * Russian last rather than English, unlike the mobile app: this is
 * runechess.ru, and the catalogue build runs inside Yandex Games. English
 * is what an English browser gets, not what an unreadable request falls
 * back to.
 *
 * [platformLanguage] is the Yandex Games SDK's `environment.i18n.lang`
 * where there is one — moderation requirement 2.14 is that the language is
 * detected through the SDK rather than assumed, and inside the catalogue
 * the platform's answer outranks the browser's.
 */
export function resolveLanguage(platformLanguage?: string | null): Language {
  const chosen = loadLanguage();
  if (chosen) return chosen;
  if (isLanguage(platformLanguage)) return platformLanguage;
  for (const candidate of navigatorLanguages()) {
    const base = candidate.split('-')[0]?.toLowerCase();
    if (isLanguage(base)) return base;
  }
  return 'ru';
}

function navigatorLanguages(): readonly string[] {
  try {
    const { languages, language } = window.navigator;
    if (languages && languages.length > 0) return languages;
    return language ? [language] : [];
  } catch {
    return [];
  }
}
