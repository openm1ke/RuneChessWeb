import { describe, it, expect } from 'vitest';
import { ru } from '../l10n/ru';
import { en } from '../l10n/en';
import { LANGUAGES, stringsFor } from '../l10n/l10nContext';

/** Every source file under `src`, as text.
 *
 * Read through Vite rather than through `node:fs`, which would mean a
 * `@types/node` dependency carried by the whole project for the sake of
 * one test. `l10n` is where the words live and `tests` is this file's own
 * kind, so both are left out. */
const sources = Object.entries(
  import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
).filter(([path]) => !path.includes('/l10n/') && !path.endsWith('.test.ts'));

/** Comments are the one place Russian belongs outside `l10n`: they explain
 * the code to whoever is reading it, and nobody playing the game ever sees
 * them. Everything left after this is text a player could read. */
function stripComments(source: string): string {
  return source
    // Newlines are kept so a finding's line number still points at the
    // line it came from.
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .split('\n')
    // Naive on purpose: a `//` inside a string literal truncates the line
    // early. That can only hide a finding, never invent one, and the same
    // line would be caught by reading it.
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('translations', () => {
  it('says the same things in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
  });

  it('keeps a key a sentence in both, or a function in both', () => {
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(typeof en[key], key).toBe(typeof ru[key]);
      if (typeof ru[key] === 'function') {
        expect((en[key] as () => unknown).length, key).toBe((ru[key] as () => unknown).length);
      }
    }
  });

  it('leaves nothing untranslated', () => {
    for (const lang of LANGUAGES) {
      const strings = stringsFor(lang);
      for (const [key, value] of Object.entries(strings)) {
        if (typeof value === 'string') expect(value.trim(), `${lang}.${key}`).not.toBe('');
      }
    }
  });
});

describe('the source outside l10n', () => {
  /**
   * The first sweep of this app counted string literals and looked nearly
   * done. It was not: JSX carries plenty of words with no quotes anywhere
   * near them. This reads whole files instead of quoted fragments, so a
   * heading typed straight into the markup is caught the same as a literal.
   *
   * The endonyms in the language picker are the deliberate exception:
   * «Русский» stays «Русский» in the English build, because a player
   * looking for their own language looks for its own name.
   */
  it('has no Russian a player could read', () => {
    const offenders = sources.flatMap(([path, source]) => {
      // The marker is written as a comment, so it has to be looked for in
      // the line as typed, not in what is left after the comments go.
      const raw = source.split('\n');
      return stripComments(source)
        .split('\n')
        .map((line, i) => [line, i] as const)
        .filter(([line, i]) => /[А-Яа-яЁё]/.test(line) && !raw[i].includes('i18n-exempt'))
        .map(([line, i]) => `${path.replace(/^\.\.?\//, '')}:${i + 1}: ${line.trim()}`);
    });
    expect(offenders).toEqual([]);
  });
});
