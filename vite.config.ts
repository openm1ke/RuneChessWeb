import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Set by `npm run build:yandex-games`. The catalogue build differs from the
 * site build in exactly one visible way — it must not carry РСЯ's ad
 * loader — and in one invisible way: `VITE_YANDEX_GAMES` tells the app to
 * use the `ysdk.adv` backend from the first frame, without waiting for the
 * SDK to confirm where it is running. Waiting would be enough time for the
 * РСЯ service to be constructed, and constructing it injects that same
 * loader script.
 */
// Declared rather than pulled in with @types/node: this config needs one
// environment variable, and one line is a smaller price than a dependency.
declare const process: { env: Record<string, string | undefined> };
const forYandexGames = process.env.VITE_YANDEX_GAMES === '1';

/** Drops the РСЯ loader from index.html for the catalogue build. Inside the
 * platform's iframe that block can never be served — the ad system there is
 * the platform's own — so the script has nothing to do but appear in a
 * moderator's network tab as a competing ad network. */
const stripRsyaLoader = {
  name: 'strip-rsya-loader',
  transformIndexHtml(html: string) {
    if (!forYandexGames) return html;
    return html.replace(
      /\s*<script[^>]*yandex\.ru\/ads\/system\/context\.js[^>]*><\/script>/g,
      '',
    );
  },
};

export default defineConfig({
  // Relative base so the built app works when published under a sub-path
  // (e.g. GitHub Pages at `username.github.io/repo-name/`) without needing
  // to know that path name at build time — every asset URL resolves
  // relative to index.html's own location instead of the domain root.
  base: './',
  plugins: [react(), stripRsyaLoader],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
