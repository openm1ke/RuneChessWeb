// Guards docs/TUTORIAL_SCRIPT.md against the code drifting away from it.
//
// The tutorial's wording exists twice — here and in the Flutter app — and
// used to exist as a `switch` inside a component on both sides, with no test
// at all. Both copies carried the same grammatical bug for months ("Начните
// с ладью") because nothing compared them to anything. The mobile app has
// the mirror of this test.
import { describe, expect, it } from 'vitest';
// Imported through Vite's `?raw` rather than read with node:fs: this project
// is typechecked by `tsc -b` without Node types.
import catalogue from '../../docs/TUTORIAL_SCRIPT.md?raw';
import { tutorialLine, tutorialPieceName, tutorialScript } from '../game/tutorialScript';
import type { PieceType } from '../game/pieceTypes';

/** Reads the `| \`id\` | text |` rows out of the catalogue's first table. */
function catalogueLines(markdown: string): Record<string, string> {
  const rows: Record<string, string> = {};
  const pattern = /^\|\s*`([a-z0-9.]+)`\s*\|\s*(.+?)\s*\|$/;
  for (const line of markdown.split('\n')) {
    const match = pattern.exec(line.trim());
    if (match) rows[match[1]] = match[2].replace(/\\\|/g, '|');
  }
  return rows;
}

describe('tutorial script', () => {
  const catalogued = catalogueLines(catalogue);

  it('matches docs/TUTORIAL_SCRIPT.md exactly', () => {
    expect(tutorialScript).toEqual(catalogued);
  });

  it('has a catalogue to compare against', () => {
    expect(Object.keys(catalogued).length).toBeGreaterThan(0);
  });

  it('names every figure in the nominative', () => {
    const types: PieceType[] = ['rook', 'bishop', 'knight', 'king', 'queen', 'pawn'];
    for (const type of types) expect(tutorialPieceName[type]).toBeTruthy();
  });

  it('reads as a sentence even with no figure to name', () => {
    expect(tutorialLine('l5.place.first')).toMatch(/^Фигура/);
    expect(tutorialLine('l5.place.first', 'rook')).toMatch(/^Ладья/);
  });

  it('never asks for a button that does not exist', () => {
    // The old solved-level line said «нажмите "ГОТОВО"» over a button
    // labelled «ПРОДОЛЖИТЬ».
    for (const [id, text] of Object.entries(tutorialScript)) {
      expect(text, `${id} names a button the game does not have`).not.toContain('ГОТОВО');
    }
  });

  it('keeps every line short enough for one line of the card', () => {
    for (const [id, text] of Object.entries(tutorialScript)) {
      expect(text.length, `${id} is ${text.length} characters`).toBeLessThanOrEqual(72);
    }
  });
});
