/**
 * Resolves a static asset path (as stored under `public/`) against Vite's
 * configured `base`, so the app keeps working when published under a
 * sub-path — e.g. GitHub Pages at `username.github.io/repo-name/` — instead
 * of hardcoding `/assets/...` paths that only resolve from the domain root.
 */
export function asset(path: string): string {
  const cleanPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}
