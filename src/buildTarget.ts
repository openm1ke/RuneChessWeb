/**
 * Where this bundle is going to run, decided at build time.
 *
 * - `site` — runechess.ru, built by `npm run build`.
 * - `yandex` — the games.yandex.ru catalogue (`VITE_YANDEX_GAMES=1`, see
 *   `tool/build-yandex-games.sh`).
 * - `playgama` — Playgama and its partner network (`VITE_PLAYGAMA=1`, see
 *   `tool/build-playgama.sh`).
 * - `vk` — the VK Games catalogue (`VITE_VK=1`, see `tool/build-vk.sh`).
 *
 * Vite substitutes the variables for literals, so every branch on these
 * folds away in the other builds — which is what keeps, say, the store
 * addresses out of a catalogue archive entirely rather than merely hidden.
 */
export const BUILT_FOR_YANDEX_GAMES = import.meta.env.VITE_YANDEX_GAMES === '1';
export const BUILT_FOR_PLAYGAMA = import.meta.env.VITE_PLAYGAMA === '1';
export const BUILT_FOR_VK = import.meta.env.VITE_VK === '1';

/**
 * The game runs inside somebody else's catalogue and frame.
 *
 * Every catalogue forbids links out of the game — to our site, our privacy
 * page, an app store — and both serve their own ads, so everything that
 * belongs to runechess.ru stays out of these builds.
 */
export const BUILT_FOR_CATALOGUE = BUILT_FOR_YANDEX_GAMES || BUILT_FOR_PLAYGAMA || BUILT_FOR_VK;

/**
 * The platform is the only service the game talks to: no Metrica (and so
 * no consent banner or analytics switch), no browser reminders, no privacy
 * page of ours. Playgama forbids external analytics outright; VK allows
 * only its own ad network (rule 5.1.2) and describes notifications as its
 * own (2.7) — and in both a frame on someone else's site is no place for
 * the browser's notification prompt.
 */
export const BUILT_WITHOUT_SITE_SERVICES = BUILT_FOR_PLAYGAMA || BUILT_FOR_VK;

/** The field stops at 2:1 on a wide screen, with the castle at its sides —
 * Playgama's checklist (§27) asks for it, and VK's desktop frame is wide. */
export const BUILT_WITH_CAPPED_FIELD = BUILT_FOR_PLAYGAMA || BUILT_FOR_VK;
