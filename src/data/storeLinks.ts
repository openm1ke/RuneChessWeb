/**
 * Where the mobile app can be downloaded, as far as the site knows today.
 *
 * `url: null` means "not published there yet", and the menu simply leaves
 * that store out — so the row appears on its own the day the first link is
 * filled in, and nobody has to remember to un-hide anything. Publishing to
 * a new store is a one-line change in this file.
 *
 * Kept out of the Yandex Games build on purpose: the catalogue forbids
 * links that take a player out of the game, and a store badge is exactly
 * that. See `BUILT_FOR_YANDEX_GAMES` in App.tsx.
 */
export interface StoreLink {
  /** Shown on the badge. */
  readonly name: string;
  /** Null until the app is actually live there. */
  readonly url: string | null;
}

export const STORE_LINKS: readonly StoreLink[] = [
  // Awaiting moderation as of 10.09.2026 — package ru.runechess.game.rustore.
  { name: 'RuStore', url: null },
  // Awaiting review as of 10.09.2026 — Apple ID 6810595002, released manually.
  { name: 'App Store', url: null },
  // Not started: no developer account yet.
  { name: 'Google Play', url: null },
  { name: 'AppGallery', url: null },
];

/** Only the stores the app is actually in. */
export function publishedStoreLinks(
  links: readonly StoreLink[] = STORE_LINKS,
): { name: string; url: string }[] {
  return links.flatMap((link) => (link.url ? [{ name: link.name, url: link.url }] : []));
}
