/**
 * Every word the game says, in the language it was written in.
 *
 * This file is the shape as well as the content: `Strings` is derived from
 * it, and `en.ts` is typed as `Strings`, so a key added here and forgotten
 * there is a compile error rather than a blank space on somebody's screen.
 * The Flutter app has the same strings under the same key names in
 * `lib/l10n/app_ru.arb`; keeping the names identical is what lets a change
 * on one side be found on the other.
 *
 * A string that takes a number or a name is a function, not a template with
 * holes in it — the compiler then checks the call sites too.
 */
import { pluralRu } from './plural';

export const ru = {
  menuDailyChallenge: 'Задание дня',
  menuDailyChallengeSoon: 'Задание дня скоро появится',
  menuPlay: 'Играть',
  menuLevelNumber: (level: number) => `Уровень ${level}`,
  menuStartGame: 'Начать игру',
  menuLevels: 'Уровни',
  menuAchievements: 'Достижения',
  menuRules: 'Правила',
  menuSettings: 'Настройки',
  menuVersion: (version: string) => `версия ${version}`,
  privacyPolicy: 'Политика конфиденциальности',
  settingsLanguage: 'Язык',

  back: 'Назад',
  commonCancel: 'Отмена',
  commonContinue: 'Продолжить',
  commonGotIt: 'Понятно',

  progressStars: (count: number) =>
    pluralRu(count, { one: 'звезда', few: 'звезды', many: 'звёзд' }),
  progressCompleted: (done: number, total: number) =>
    `Пройдено ${done} из ${total}`,
};

/**
 * The shape every language has to fill.
 *
 * Deliberately not `as const`: that would make each value its own literal
 * type, and `en.ts` would fail to compile for the excellent reason that
 * "Play" is not "Играть". What has to match is the set of keys and the
 * arguments each one takes, which is exactly what this says.
 */
export type Strings = typeof ru;
