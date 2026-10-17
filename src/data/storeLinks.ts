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
 * that. That is enforced twice, because once is not enough:
 *
 *   - the addresses themselves are compiled out below, so the catalogue
 *     archive does not carry the strings at all;
 *   - `menuStoreLinks` refuses to hand the menu anything to draw.
 *
 * The first is what `tool/build-yandex-games.sh` actually checks — it greps
 * the finished archive for `apps.apple.com` and `rustore.ru` and fails the
 * build on a hit. Hiding a badge at render time leaves the address sitting
 * in the bundle, which that check counts as a violation, and rightly: a
 * link nobody clicks is still a link shipped into the catalogue.
 */

// Vite substitutes the build target for a literal, so in a catalogue
// build the branch below folds away and the addresses never reach the
// bundle. See `buildTarget.ts`.
import { BUILT_FOR_CATALOGUE } from '../buildTarget';

/**
 * The store's own badge artwork, as the store publishes it.
 *
 * Drawn rather than described, because both Apple and RuStore hand out the
 * badge as a finished asset and forbid redrawing it — the shapes, the
 * wording and the plate behind them are theirs. The footer scales every
 * badge to one shared height and lets the width follow its intrinsic aspect
 * ratio, so none of the artwork is stretched.
 */
export interface StoreBadge {
  /** File under `assets/badges/`. */
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** Which string says what the badge says, for anyone who cannot see it.
   * A key rather than the words, because the footer is drawn in whichever
   * language the visitor is reading. */
  readonly altKey: 'storeBadgeRuStore' | 'storeBadgeAppStore' | 'storeBadgeGooglePlay';
}

export interface StoreLink {
  /** Names the store in code and in labels; the badge carries its own text. */
  readonly name: string;
  /** Null until the app is actually live there. */
  readonly url: string | null;
  /** Null until that store's official badge has been added. */
  readonly badge: StoreBadge | null;
}

export const STORE_LINKS: readonly StoreLink[] = BUILT_FOR_CATALOGUE
  ? []
  : [
      // Live since 09.09.2026 — package ru.runechess.game.rustore. The
      // badge is RuStore's own "colour on dark" variant, the one meant for
      // a dark background; the light one would sit on the menu as a white
      // slab.
      {
        name: 'RuStore',
        url: 'https://www.rustore.ru/catalog/app/ru.runechess.game.rustore',
        badge: {
          file: 'rustore-ru.svg',
          width: 111,
          height: 40,
          altKey: 'storeBadgeRuStore' as const,
        },
      },
      // Live since 16.09.2026 — Apple ID 6810595002. The link carries no
      // country segment on purpose: Apple sends each visitor to their own
      // storefront, while a hard-coded `/us/` would send a Russian player
      // to a page they cannot install from.
      {
        name: 'App Store',
        url: 'https://apps.apple.com/app/id6810595002',
        badge: {
          file: 'app-store-ru.svg',
          width: 119.66407,
          height: 40,
          altKey: 'storeBadgeAppStore' as const,
        },
      },
      // Official Russian Google Play badge, downloaded from Google's badge
      // resource. Google ships it with transparent bands above and below the
      // plate (646×250 around a 646×192 badge), which drew it visibly
      // smaller than its neighbours at the same height; the file is cropped
      // to the plate itself, and the clear space around it comes from the
      // footer's gap instead.
      {
        name: 'Google Play',
        url: 'https://play.google.com/store/apps/details?id=ru.runechess.game',
        badge: {
          file: 'google-play-ru.png',
          width: 646,
          height: 192,
          altKey: 'storeBadgeGooglePlay' as const,
        },
      },
      { name: 'AppGallery', url: null, badge: null },
    ];

export interface PublishedStoreLink {
  readonly name: string;
  readonly url: string;
  readonly badge: StoreBadge;
}

/**
 * Only the stores the app is actually in, and only those whose badge we
 * actually have.
 *
 * Both halves are required on purpose: a live link with no badge would have
 * to be drawn as something of our own invention, and an invented badge is
 * the one thing every store's brand rules forbid.
 */
export function publishedStoreLinks(
  links: readonly StoreLink[] = STORE_LINKS,
): PublishedStoreLink[] {
  return links.flatMap(({ name, url, badge }) => (url && badge ? [{ name, url, badge }] : []));
}

/**
 * The badges this build's menu may show.
 *
 * Inside the Yandex Games catalogue there are none at all: §8.4.2 forbids
 * links out of the game, and a store badge is nothing but a link out.
 */
export function menuStoreLinks(
  builtForYandexGames: boolean,
  links: readonly StoreLink[] = STORE_LINKS,
): PublishedStoreLink[] {
  return builtForYandexGames ? [] : publishedStoreLinks(links);
}
