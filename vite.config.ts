import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the built app works when published under a sub-path
  // (e.g. GitHub Pages at `username.github.io/repo-name/`) without needing
  // to know that path name at build time — every asset URL resolves
  // relative to index.html's own location instead of the domain root.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
