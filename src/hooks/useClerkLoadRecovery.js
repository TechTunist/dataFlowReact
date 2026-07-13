import { useCallback, useEffect, useRef, useState } from 'react';
import { reloadOnce } from '../utils/reloadOnce';

/** How long Clerk may stay unloaded on a visible tab before we treat it as stuck. */
export const CLERK_LOAD_TIMEOUT_MS = 12_000;

/** Shorter grace after tab wake / visibility restore while still unloaded. */
export const CLERK_RESUME_TIMEOUT_MS = 8_000;

function setClerkLoadedFlag(loaded) {
  try {
    window.__CRYPTOLOGICAL_CLERK_LOADED__ = loaded;
  } catch {
    // ignore (sandbox / restricted environments)
  }
}

/**
 * Prevents infinite AppBootScreen soft-locks when Clerk never finishes loading
 * after cold start, tab discard, or browser wake (common in Brave/Chrome).
 *
 * - Tracks a global flag for registerAppRecovery wake handlers
 * - Auto-reloads once via reloadOnce after a timeout (respects session limits)
 * - Exposes `stuck` so UI can show a manual Reload button if auto-reload is skipped
 *
 * @param {boolean} isLoaded - Clerk useAuth().isLoaded
 * @returns {{ stuck: boolean, hardReload: () => void }}
 */
export function useClerkLoadRecovery(isLoaded) {
  const [stuck, setStuck] = useState(false);
  const timeoutIdRef = useRef(null);
  const isLoadedRef = useRef(isLoaded);
  isLoadedRef.current = isLoaded;

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current != null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const markStuckAndReload = useCallback((reason) => {
    setStuck(true);
    setClerkLoadedFlag(false);
    reloadOnce(reason);
  }, []);

  const scheduleTimeout = useCallback(
    (ms, reason) => {
      clearTimer();
      timeoutIdRef.current = window.setTimeout(() => {
        timeoutIdRef.current = null;
        if (isLoadedRef.current) return;
        markStuckAndReload(reason);
      }, ms);
    },
    [clearTimer, markStuckAndReload]
  );

  useEffect(() => {
    if (isLoaded) {
      clearTimer();
      setStuck(false);
      setClerkLoadedFlag(true);
      return undefined;
    }

    setClerkLoadedFlag(false);

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      scheduleTimeout(CLERK_LOAD_TIMEOUT_MS, 'clerk-load-timeout');
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Paused tabs throttle timers; avoid firing mid-sleep and count resume cleanly.
        clearTimer();
        return;
      }
      if (document.visibilityState !== 'visible') return;
      if (isLoadedRef.current) return;
      scheduleTimeout(CLERK_RESUME_TIMEOUT_MS, 'clerk-load-timeout-after-resume');
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimer();
    };
  }, [isLoaded, clearTimer, scheduleTimeout]);

  const hardReload = useCallback(() => {
    window.location.reload();
  }, []);

  return { stuck, hardReload };
}
