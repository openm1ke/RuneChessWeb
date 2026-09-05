// Guards docs/ANALYTICS_EVENTS.md against the code drifting away from it.
//
// The web and the mobile app must send the same event names: one funnel
// counted over two different sets of names is not one funnel. That has gone
// wrong before, and it was noticed only because two dashboards disagreed —
// months later. The mobile app has the mirror of this test.
import { describe, expect, it } from 'vitest';
// Imported through Vite's `?raw` rather than read with node:fs: this project
// is typechecked by `tsc -b` without Node types, so a `node:fs` import builds
// locally under vitest and fails the deploy.
import catalogue from '../../docs/ANALYTICS_EVENTS.md?raw';
import analyticsSource from '../services/analyticsService.ts?raw';

/** Event names lifted from the catalogue's table, so the doc is what is
 * actually asserted rather than a second list maintained beside it. */
function catalogueEvents(): Set<string> {
  const doc = catalogue;
  const names = new Set<string>();
  for (const row of doc.matchAll(/^\| `([^`]+)`(?: \/ `([^`]+)`)? \|(.*)$/gm)) {
    // Column 3 is the mobile mark, column 4 the web one; a dash there means
    // the platform deliberately does not send it.
    const cells = row[3].split('|').map((cell: string) => cell.trim());
    if (cells[1] === '—') continue;
    names.add(row[1]);
    if (row[2]) names.add(row[2]);
  }
  return names;
}

/** Every name passed to `this.goal(...)`. */
function reportedEvents(): Set<string> {
  const source = analyticsSource;
  const names = new Set<string>();
  for (const call of source.matchAll(/this\.goal\(\s*'([a-z][a-z0-9_]*)'/g)) names.add(call[1]);
  // rulesOpened talks to `ym` directly, because it has to wait for the
  // callback before navigating away.
  for (const call of source.matchAll(/'reachGoal',\s*'([a-z][a-z0-9_]*)'/g)) names.add(call[1]);
  return names;
}

const difference = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x));

describe('analytics catalogue', () => {
  it('every event the app sends is in docs/ANALYTICS_EVENTS.md', () => {
    expect(difference(reportedEvents(), catalogueEvents())).toEqual([]);
  });

  it('every event the catalogue promises for the web is actually sent', () => {
    expect(difference(catalogueEvents(), reportedEvents())).toEqual([]);
  });

  it('the catalogue is not empty, so a broken parse cannot pass silently', () => {
    expect(catalogueEvents().size).toBeGreaterThan(20);
  });
});
