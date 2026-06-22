/**
 * Detect Vite/Webpack-style dynamic import / chunk load failures.
 * These commonly happen when a tab was open across a Vercel deploy (stale hashed assets).
 */
export function isChunkLoadError(error) {
  if (!error) return false;

  const message = String(error.message || error);
  const name = String(error.name || '');

  if (name === 'ChunkLoadError') return true;

  return (
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Unable to preload CSS for/i.test(message)
  );
}