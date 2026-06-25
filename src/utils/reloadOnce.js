const RELOAD_GUARD_KEY = 'cryptological:auto-reload-at';
const RELOAD_COUNT_KEY = 'cryptological:auto-reload-count';
const RELOAD_COOLDOWN_MS = 60_000;
const MAX_RELOADS_PER_SESSION = 2;

/**
 * Reload at most once per cooldown window to avoid infinite reload loops.
 * @param {string} reason - logged for debugging
 * @returns {boolean} whether a reload was triggered
 */
export function reloadOnce(reason) {
  try {
    const reloadCount = Number.parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);
    if (reloadCount >= MAX_RELOADS_PER_SESSION) {
      if (typeof console !== 'undefined') {
        console.warn(`[app-recovery] Skipping reload (${reason}) — session limit reached`);
      }
      return false;
    }

    const last = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const now = Date.now();
    if (last && now - Number.parseInt(last, 10) < RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(reloadCount + 1));
  } catch {
    // sessionStorage may be unavailable (private mode quirks) — still attempt one reload
  }

  if (typeof console !== 'undefined') {
    console.warn(`[app-recovery] Reloading (${reason})`);
  }
  window.location.reload();
  return true;
}

export function getCurrentBuildId() {
  const meta = document.querySelector('meta[name="app-build-id"]');
  return meta?.getAttribute('content') || null;
}

export async function fetchLatestBuildId() {
  const response = await fetch(`/?build-check=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok) return null;
  const html = await response.text();
  const match = html.match(/<meta\s+name="app-build-id"\s+content="([^"]*)"/i);
  return match?.[1] || null;
}