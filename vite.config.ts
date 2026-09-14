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

/** Strips from index.html everything that belongs to runechess.ru and not
 * to a game running inside somebody else's iframe.
 *
 * Two separate reasons, both learned the hard way. The РСЯ loader can never
 * serve our block from the catalogue — the ad system there is the
 * platform's own — so it would only show up in a moderator's network tab as
 * a competing ad network. And the SEO head names our domain five times over
 * in canonical, og:url, og:image and JSON-LD; §8.4.2 of the platform rules
 * forbids pointing at any resource of ours, and the first submission was
 * rejected for exactly that kind of reference. None of it does anything
 * useful inside an iframe the search engines never index. */
const stripSiteReferences = {
  name: 'strip-site-references',
  transformIndexHtml(html: string) {
    if (!forYandexGames) return html;
    return html
      .replace(/\s*<script[^>]*yandex\.ru\/ads\/system\/context\.js[^>]*><\/script>/g, '')
      .replace(/\s*<link rel="canonical"[^>]*>/g, '')
      .replace(/\s*<meta property="og:[^"]*"[^>]*>/g, '')
      .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
      // Developer notes in the markup mention the site by name. Harmless to
      // a reader, but they have no business in a shipped archive, and the
      // build's own check for outbound references is stricter than a
      // moderator's eye on purpose.
      .replace(/\s*<!--[\s\S]*?-->/g, '');
  },
};

export default defineConfig({
  // Relative base so the built app works when published under a sub-path
  // (e.g. GitHub Pages at `username.github.io/repo-name/`) without needing
  // to know that path name at build time — every asset URL resolves
  // relative to index.html's own location instead of the domain root.
  base: './',
  plugins: [react(), stripSiteReferences],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
