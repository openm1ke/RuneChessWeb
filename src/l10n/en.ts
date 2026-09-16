/**
 * The English copy.
 *
 * Typed as `Strings`, which is derived from `ru.ts`: a key missing here, or
 * one whose function takes the wrong arguments, fails the build. That is
 * deliberately stricter than the Flutter side, where the same guarantee
 * needs a test — TypeScript can simply refuse to compile it.
 *
 * English is also the fallback: it is what a visitor gets when their
 * browser asks for a language we do not have, so it is the one that must
 * never be incomplete.
 */
import { pluralEn } from './plural';
import type { Strings } from './ru';

export const en: Strings = {
  menuDailyChallenge: 'Daily challenge',
  menuDailyChallengeSoon: 'The daily challenge is on its way',
  menuPlay: 'Play',
  menuLevelNumber: (level: number) => `Level ${level}`,
  menuStartGame: 'Start the game',
  menuLevels: 'Levels',
  menuAchievements: 'Achievements',
  menuRules: 'Rules',
  menuSettings: 'Settings',
  menuVersion: (version: string) => `version ${version}`,
  privacyPolicy: 'Privacy policy',
  settingsLanguage: 'Language',

  back: 'Back',
  commonCancel: 'Cancel',
  commonContinue: 'Continue',
  commonGotIt: 'Got it',

  progressStars: (count: number) => pluralEn(count, 'star', 'stars'),
  progressCompleted: (done: number, total: number) =>
    `${done} of ${total} solved`,
};
