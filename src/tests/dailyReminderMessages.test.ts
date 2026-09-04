import { describe, expect, it } from 'vitest';
import { pickReminderMessage } from '../services/dailyReminderMessages';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe('pickReminderMessage', () => {
  it('never mentions the streak when there is none', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 50; i++) {
      const message = pickReminderMessage({ currentStreak: 0, freezeAvailable: true, random });
      expect(message).not.toMatch(/стрик/i);
    }
  });

  it('avoids repeating the immediately previous message when the pool allows it', () => {
    const random = seededRandom(7);
    let previous: string | null = null;
    for (let i = 0; i < 50; i++) {
      const message = pickReminderMessage({ currentStreak: 0, freezeAvailable: true, previous, random });
      expect(message).not.toBe(previous);
      previous = message;
    }
  });

  it('can mention streak risk once the freeze is spent', () => {
    const random = seededRandom(3);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickReminderMessage({ currentStreak: 5, freezeAvailable: false, random }));
    }
    expect([...seen].some((m) => /прерваться|потеряйте/i.test(m))).toBe(true);
  });

  it('mostly picks a neutral, non-streak message even with an active streak', () => {
    const random = seededRandom(11);
    let neutralCount = 0;
    const total = 200;
    for (let i = 0; i < total; i++) {
      const message = pickReminderMessage({ currentStreak: 10, freezeAvailable: true, random });
      // Every streak/risk message mentions the streak itself, the freeze,
      // consecutive-day wording, or the streak resetting — a plain neutral
      // nudge never does, even though "день/дня" alone isn't a reliable
      // signal (several neutral texts say things like "головоломка дня").
      if (!/стрик|фриз|подряд|обнул/i.test(message)) neutralCount++;
    }
    expect(neutralCount).toBeGreaterThan(total / 2);
  });

  it('has at least 20 distinct messages across every state, so a player '
    + 'who plays for weeks does not see the same handful on repeat', () => {
    const random = seededRandom(23);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      seen.add(pickReminderMessage({ currentStreak: 9, freezeAvailable: false, random }));
      seen.add(pickReminderMessage({ currentStreak: 9, freezeAvailable: true, random }));
      seen.add(pickReminderMessage({ currentStreak: 0, freezeAvailable: true, random }));
    }
    expect(seen.size).toBeGreaterThanOrEqual(20);
  });
});
