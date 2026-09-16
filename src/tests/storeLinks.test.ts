// The site advertises only the stores the app is really in. A badge that
// leads nowhere is worse than no badge: it reads as a broken promise on the
// first page a visitor sees.
//
// And inside the Yandex Games catalogue there are no badges at all —
// §8.4.2 forbids links that lead a player out of the game, so shipping one
// there is not a cosmetic slip but grounds for rejection.
import { describe, expect, it } from 'vitest';
import type { StoreBadge } from '../data/storeLinks';
import { STORE_LINKS, menuStoreLinks, publishedStoreLinks } from '../data/storeLinks';

const badge: StoreBadge = { file: 'x.svg', width: 111, height: 40, alt: 'x' };

describe('storeLinks', () => {
  it('leaves out a store the app is not published in', () => {
    expect(
      publishedStoreLinks([
        { name: 'RuStore', url: null, badge },
        { name: 'App Store', url: 'https://apps.apple.com/app/id6810595002', badge },
      ]),
    ).toEqual([
      { name: 'App Store', url: 'https://apps.apple.com/app/id6810595002', badge },
    ]);
  });

  it('shows nothing at all while nothing is published', () => {
    expect(publishedStoreLinks([{ name: 'RuStore', url: null, badge }])).toEqual([]);
  });

  it('every real entry carries an absolute https link', () => {
    for (const { url } of publishedStoreLinks()) {
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it('carries the two stores the app is actually in', () => {
    expect(publishedStoreLinks().map(({ name }) => name)).toEqual(['RuStore', 'App Store']);
  });

  it('sends every visitor to their own App Store storefront', () => {
    // A `/us/` in the path pins the page to one country, and a Russian
    // player landing there cannot install from it.
    const appStore = STORE_LINKS.find(({ name }) => name === 'App Store');
    expect(appStore?.url).toBe('https://apps.apple.com/app/id6810595002');
  });

  it('gives every published store the official badge to draw', () => {
    // A store with a link but no artwork must stay off the menu rather
    // than be drawn with something of our own: every one of these brands
    // forbids a redrawn badge.
    for (const { badge } of publishedStoreLinks()) {
      expect(badge.file).toMatch(/\.svg$/);
      expect(badge.width).toBeGreaterThan(0);
      expect(badge.height).toBeGreaterThan(0);
      expect(badge.alt).not.toHaveLength(0);
    }
  });

  it('leaves out a store whose badge is still missing', () => {
    expect(
      publishedStoreLinks([{ name: 'Google Play', url: 'https://example.com/a', badge: null }]),
    ).toEqual([]);
  });
});

describe('menuStoreLinks', () => {
  it('shows the badges on the site', () => {
    expect(menuStoreLinks(false).map(({ name }) => name)).toEqual(['RuStore', 'App Store']);
  });

  it('shows no badge at all inside Yandex Games', () => {
    // Not "hidden behind a flag" — the catalogue build must not contain a
    // single link that leaves the game.
    expect(menuStoreLinks(true)).toEqual([]);
  });

  it('shows no badge inside Yandex Games even once every store is published', () => {
    expect(
      menuStoreLinks(true, [
        { name: 'RuStore', url: 'https://example.com/a', badge },
        { name: 'App Store', url: 'https://example.com/b', badge },
      ]),
    ).toEqual([]);
  });
});
