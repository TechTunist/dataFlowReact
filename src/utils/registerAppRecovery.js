import { isChunkLoadError } from './isChunkLoadError';
import { fetchLatestBuildId, getCurrentBuildId, reloadOnce } from './reloadOnce';

const BOOT_WATCHDOG_MS = 20_000;
const DEPLOY_CHECK_MIN_HIDDEN_MS = 30_000;

let bootWatchdogId = null;
let hiddenSince = null;
let deployCheckInFlight = false;

function markAppMounted() {
  if (bootWatchdogId != null) {
    window.clearTimeout(bootWatchdogId);
    bootWatchdogId = null;
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
  const placeholder = root.querySelector('#app-boot-placeholder');
  if (!placeholder) return false;
  return root.children.length <= 2;
}

function scheduleBootWatchdog() {
  bootWatchdogId = window.setTimeout(() => {
    if (window.__CRYPTOLOGICAL_APP_MOUNTED__) return;
    if (!isStillOnStaticBootPlaceholder()) return;
    reloadOnce('boot-watchdog');
  }, BOOT_WATCHDOG_MS);
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
    // Network may still be waking after sleep — ignore
  } finally {
    deployCheckInFlight = false;
  }
}

function handleRecoverableError(error, source) {
  if (!isChunkLoadError(error)) return false;
  reloadOnce(source);
  return true;
}

/**
 * Register global handlers for stale assets, bfcache wake, and hung boots.
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
        if (src.includes('/static/')) {
          reloadOnce('asset-load-error');
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
    // Restored from bfcache after sleep/navigation — SPAs often need a fresh load.
    if (!window.__CRYPTOLOGICAL_APP_MOUNTED__) {
      reloadOnce('bfcache-before-mount');
      return;
    }
    void checkForNewDeployment();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now();
      return;
    }
    if (document.visibilityState !== 'visible') return;

    const hiddenDuration = hiddenSince ? Date.now() - hiddenSince : 0;
    hiddenSince = null;

    if (hiddenDuration >= DEPLOY_CHECK_MIN_HIDDEN_MS) {
      void checkForNewDeployment();
    }
  });

  scheduleBootWatchdog();
}

export { markAppMounted };