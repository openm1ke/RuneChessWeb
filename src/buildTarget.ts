/**
 * Where this bundle is going to run, decided at build time.
 *
 * - `site` — runechess.ru, built by `npm run build`.
 * - `yandex` — the games.yandex.ru catalogue (`VITE_YANDEX_GAMES=1`, see
 *   `tool/build-yandex-games.sh`).
 * - `playgama` — Playgama and its partner network (`VITE_PLAYGAMA=1`, see
 *   `tool/build-playgama.sh`).
 *
 * Vite substitutes the variables for literals, so every branch on these
 * folds away in the other builds — which is what keeps, say, the store
 * addresses out of a catalogue archive entirely rather than merely hidden.
 */
export const BUILT_FOR_YANDEX_GAMES = import.meta.env.VITE_YANDEX_GAMES === '1';
export const BUILT_FOR_PLAYGAMA = import.meta.env.VITE_PLAYGAMA === '1';

/**
 * The game runs inside somebody else's catalogue and frame.
 *
 * Both catalogues forbid links out of the game — to our site, our privacy
 * page, an app store — and both serve their own ads, so everything that
 * belongs to runechess.ru stays out of these builds.
 */
export const BUILT_FOR_CATALOGUE = BUILT_FOR_YANDEX_GAMES || BUILT_FOR_PLAYGAMA;
