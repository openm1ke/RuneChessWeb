// The site advertises only the stores the app is really in. A badge that
// leads nowhere is worse than no badge: it reads as a broken promise on the
// first page a visitor sees.
import { describe, expect, it } from 'vitest';
import { publishedStoreLinks } from '../data/storeLinks';

describe('storeLinks', () => {
  it('leaves out a store the app is not published in', () => {
    expect(
      publishedStoreLinks([
        { name: 'RuStore', url: null },
        { name: 'App Store', url: 'https://apps.apple.com/app/id6810595002' },
      ]),
    ).toEqual([{ name: 'App Store', url: 'https://apps.apple.com/app/id6810595002' }]);
  });

  it('shows nothing at all while nothing is published', () => {
    expect(publishedStoreLinks([{ name: 'RuStore', url: null }])).toEqual([]);
  });

  it('every real entry carries an absolute https link', () => {
    for (const { url } of publishedStoreLinks()) {
      expect(url).toMatch(/^https:\/\//);
    }
  });
});
