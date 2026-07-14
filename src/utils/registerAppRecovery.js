import { isChunkLoadError } from './isChunkLoadError';
import { fetchLatestBuildId, getCurrentBuildId, hardNavigateReload, reloadOnce } from './reloadOnce';
import { showStaticBootStuck } from './showStaticBootStuck';

const BOOT_WATCHDOG_MS = 12_000;
const BOOT_STUCK_UI_MS = 15_000;
const DEPLOY_CHECK_MIN_HIDDEN_MS = 120_000;
/** After long background, if Clerk never finished loading, force a reload. */
const CLERK_WAKE_UNLOADED_MS = 6_000;

let bootWatchdogId = null;
let bootStuckUiId = null;
let clerkWakeWatchdogId = null;
let hiddenSince = null;
let deployCheckInFlight = false;

function markAppMounted() {
  if (bootWatchdogId != null) {
    window.clearTimeout(bootWatchdogId);
    bootWatchdogId = null;
  }
  if (bootStuckUiId != null) {
    window.clearTimeout(bootStuckUiId);
    bootStuckUiId = null;
  }
  try {
    window.__CRYPTOLOGICAL_APP_MOUNTED__ = true;
  } catch {
    // ignore
  }
}

function isStillOnStaticBootPlaceholder() {
  const root = document.getElementById('root');
  if (!root) return false;
  if (window.__CRYPTOLOGICAL_APP_MOUNTED__) return false;
  const placeholder = root.querySelector('#app-boot-placeholder');
  if (placeholder) return true;
  // React never took over: root still only has the static boot tree.
  return root.children.length <= 2 && root.textContent.includes('Loading');
}

function scheduleBootWatchdog() {
  bootWatchdogId = window.setTimeout(() => {
    if (window.__CRYPTOLOGICAL_APP_MOUNTED__) return;
    if (!isStillOnStaticBootPlaceholder()) return;
    const reloaded = reloadOnce('boot-watchdog');
    if (!reloaded) {
      showStaticBootStuck('The app failed to start after several attempts.');
    }
  }, BOOT_WATCHDOG_MS);

  // Independent of reload budget: always offer a manual way out if JS never mounts.
  bootStuckUiId = window.setTimeout(() => {
    if (window.__CRYPTOLOGICAL_APP_MOUNTED__) return;
    if (!isStillOnStaticBootPlaceholder()) return;
    showStaticBootStuck();
  }, BOOT_STUCK_UI_MS);
}

function clearClerkWakeWatchdog() {
  if (clerkWakeWatchdogId != null) {
    window.clearTimeout(clerkWakeWatchdogId);
    clerkWakeWatchdogId = null;
  }
}

/**
 * If React mounted but Clerk never reported loaded (tab sleep/wake soft-lock),
 * reload after a short grace so we do not rely solely on React timers that may
 * have been frozen while the tab was hidden.
 */
function scheduleClerkWakeWatchdog() {
  clearClerkWakeWatchdog();
  clerkWakeWatchdogId = window.setTimeout(() => {
    clerkWakeWatchdogId = null;
    if (!window.__CRYPTOLOGICAL_APP_MOUNTED__) return;
    if (window.__CRYPTOLOGICAL_CLERK_LOADED__ !== false) return;
    const reloaded = reloadOnce('clerk-still-unloaded-after-wake');
    if (!reloaded) {
      showStaticBootStuck('Session restore is taking longer than expected.');
    }
  }, CLERK_WAKE_UNLOADED_MS);
}

async function checkForNewDeployment() {
  if (deployCheckInFlight) return;
  const currentBuildId = getCurrentBuildId();
  if (!currentBuildId) return;

  deployCheckInFlight = true;
  try {
    const latestBuildId = await fetchLatestBuildId();
    if (latestBuildId && latestBuildId !== currentBuildId) {
      reloadOnce('new-deployment-detected');
    }
  } catch {
    // Network may still be waking after sleep, ignore
  } finally {
    deployCheckInFlight = false;
  }
}

function handleRecoverableError(error, source) {
  if (!isChunkLoadError(error)) return false;
  const reloaded = reloadOnce(source);
  if (!reloaded) {
    showStaticBootStuck('A required script failed to load.');
  }
  return true;
}

/**
 * Register global handlers for stale assets, bfcache wake, hung boots,
 * and Clerk stuck-unloaded after tab resume.
 * Call once before React mounts.
 */
export function registerAppRecovery() {
  if (typeof window === 'undefined') return;

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const src = target.src || target.href || '';
        if (src.includes('/static/') && !window.__CRYPTOLOGICAL_APP_MOUNTED__) {
          const reloaded = reloadOnce('asset-load-error');
          if (!reloaded) showStaticBootStuck('A required asset failed to load.');
        }
        return;
      }
      handleRecoverableError(event.error, 'window-error');
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    if (handleRecoverableError(event.reason, 'unhandled-chunk-rejection')) {
      event.preventDefault();
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    // Restored from bfcache after sleep/navigation, SPAs often need a fresh load.
    if (!window.__CRYPTOLOGICAL_APP_MOUNTED__) {
      reloadOnce('bfcache-before-mount');
      return;
    }
    // App was mounted but a protected route is blocked on hung Clerk rehydrate.
    if (
      window.__CRYPTOLOGICAL_CLERK_BLOCKING__ === true &&
      window.__CRYPTOLOGICAL_CLERK_LOADED__ === false
    ) {
      reloadOnce('bfcache-clerk-unloaded');
      return;
    }
    void checkForNewDeployment();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now();
      clearClerkWakeWatchdog();
      return;
    }
    if (document.visibilityState !== 'visible') return;

    const hiddenDuration = hiddenSince ? Date.now() - hiddenSince : 0;
    hiddenSince = null;

    // Secondary safety net: React hook also times out; this covers cases where
    // React effects did not re-run cleanly after a long freeze.
    // Only when a protected route is blocking on Clerk (public pages may idle unloaded).
    if (
      window.__CRYPTOLOGICAL_APP_MOUNTED__ &&
      window.__CRYPTOLOGICAL_CLERK_BLOCKING__ === true &&
      window.__CRYPTOLOGICAL_CLERK_LOADED__ === false
    ) {
      scheduleClerkWakeWatchdog();
    }

    if (hiddenDuration >= DEPLOY_CHECK_MIN_HIDDEN_MS) {
      void checkForNewDeployment();
    }
  });

  // Cold boot: tab may open offline; when network returns, force a clean load
  // if we never finished mounting. Only force Clerk recovery when a protected
  // route is actually gated on auth (not while public pages wait in the background).
  window.addEventListener('online', () => {
    if (!window.__CRYPTOLOGICAL_APP_MOUNTED__) {
      hardNavigateReload('online-before-mount');
      return;
    }
    if (
      window.__CRYPTOLOGICAL_CLERK_BLOCKING__ === true &&
      window.__CRYPTOLOGICAL_CLERK_LOADED__ === false
    ) {
      const reloaded = reloadOnce('online-clerk-unloaded');
      if (!reloaded) {
        showStaticBootStuck('Network restored, but the session did not finish loading.');
      }
    }
  });

  scheduleBootWatchdog();
}

export { markAppMounted };
