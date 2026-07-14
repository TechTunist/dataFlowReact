import { useCallback, useEffect, useRef, useState } from 'react';
import { hardNavigateReload, reloadOnce } from '../utils/reloadOnce';

/** How long Clerk may stay unloaded on a visible tab before we treat it as stuck. */
export const CLERK_LOAD_TIMEOUT_MS = 8_000;

/** Shorter grace after tab wake / visibility restore while still unloaded. */
export const CLERK_RESUME_TIMEOUT_MS = 5_000;

/** Poll interval backup when setTimeout is heavily throttled after sleep/boot. */
export const CLERK_STUCK_POLL_MS = 2_000;

function setClerkLoadedFlag(loaded) {
  try {
    window.__CRYPTOLOGICAL_CLERK_LOADED__ = loaded;
  } catch {
    // ignore (sandbox / restricted environments)
  }
}

/** True only while a protected route is gated on Clerk (not public pages). */
function setClerkBlockingFlag(blocking) {
  try {
    window.__CRYPTOLOGICAL_CLERK_BLOCKING__ = blocking;
  } catch {
    // ignore
  }
}

/**
 * Prevents infinite AppBootScreen soft-locks when Clerk never finishes loading
 * after cold start, tab discard, or browser wake (common in Brave/Chrome).
 *
 * - Tracks a global flag for registerAppRecovery wake handlers
 * - Auto-reloads via reloadOnce after a timeout (respects session limits)
 * - Always flips `stuck` so UI shows a manual Reload button (even if auto-reload runs/skips)
 * - Listens for `online` so laptop-boot offline→online can recover
 * - Interval backup in case visibility timers were frozen across sleep
 *
 * @param {boolean} isLoaded - Clerk useAuth().isLoaded
 * @param {{ enableAutoRecover?: boolean }} [options]
 *   When enableAutoRecover is false (public routes rendering without waiting
 *   for Clerk), only track the loaded flag — do not auto-reload or mark stuck.
 * @returns {{ stuck: boolean, hardReload: () => void }}
 */
export function useClerkLoadRecovery(isLoaded, options = {}) {
  const enableAutoRecover = options.enableAutoRecover !== false;
  const [stuck, setStuck] = useState(false);
  const timeoutIdRef = useRef(null);
  const pollIdRef = useRef(null);
  const stuckDeadlineRef = useRef(null);
  const recoveryAttemptedRef = useRef(false);
  const isLoadedRef = useRef(isLoaded);
  isLoadedRef.current = isLoaded;
  const enableAutoRecoverRef = useRef(enableAutoRecover);
  enableAutoRecoverRef.current = enableAutoRecover;

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current != null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const clearPoll = useCallback(() => {
    if (pollIdRef.current != null) {
      window.clearInterval(pollIdRef.current);
      pollIdRef.current = null;
    }
  }, []);

  const markStuckAndRecover = useCallback((reason) => {
    if (!enableAutoRecoverRef.current) return;
    setStuck(true);
    setClerkLoadedFlag(false);
    if (recoveryAttemptedRef.current) return;
    recoveryAttemptedRef.current = true;
    const didReload = reloadOnce(reason);
    // If auto-reload was skipped (cooldown / session cap), leave stuck UI up.
    // Manual hardReload still works.
    if (!didReload && typeof console !== 'undefined') {
      console.warn(`[app-recovery] Clerk stuck (${reason}); showing manual reload`);
    }
  }, []);

  const scheduleTimeout = useCallback(
    (ms, reason) => {
      clearTimer();
      stuckDeadlineRef.current = Date.now() + ms;
      timeoutIdRef.current = window.setTimeout(() => {
        timeoutIdRef.current = null;
        if (isLoadedRef.current) return;
        markStuckAndRecover(reason);
      }, ms);
    },
    [clearTimer, markStuckAndRecover]
  );

  useEffect(() => {
    if (isLoaded) {
      clearTimer();
      clearPoll();
      setStuck(false);
      recoveryAttemptedRef.current = false;
      stuckDeadlineRef.current = null;
      setClerkLoadedFlag(true);
      setClerkBlockingFlag(false);
      return undefined;
    }

    setClerkLoadedFlag(false);
    recoveryAttemptedRef.current = false;

    // Public pages render without waiting for Clerk — don't auto-reload them.
    if (!enableAutoRecover) {
      clearTimer();
      clearPoll();
      setStuck(false);
      setClerkBlockingFlag(false);
      return undefined;
    }

    setClerkBlockingFlag(true);

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      scheduleTimeout(CLERK_LOAD_TIMEOUT_MS, 'clerk-load-timeout');
    }

    // Backup poll: after laptop sleep/boot, setTimeout can stall until a later
    // paint; wall-clock deadline still advances via Date.now().
    clearPoll();
    pollIdRef.current = window.setInterval(() => {
      if (isLoadedRef.current) return;
      const deadline = stuckDeadlineRef.current;
      if (deadline != null && Date.now() >= deadline) {
        markStuckAndRecover('clerk-load-timeout-poll');
      }
    }, CLERK_STUCK_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Paused tabs throttle timers; avoid firing mid-sleep and count resume cleanly.
        clearTimer();
        stuckDeadlineRef.current = null;
        return;
      }
      if (document.visibilityState !== 'visible') return;
      if (isLoadedRef.current) return;
      recoveryAttemptedRef.current = false;
      scheduleTimeout(CLERK_RESUME_TIMEOUT_MS, 'clerk-load-timeout-after-resume');
    };

    // Laptop boot often loads the tab offline first; when the NIC comes up, hard-recover.
    const onOnline = () => {
      if (isLoadedRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      markStuckAndRecover('clerk-load-timeout-after-online');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      clearTimer();
      clearPoll();
    };
  }, [isLoaded, enableAutoRecover, clearTimer, clearPoll, scheduleTimeout, markStuckAndRecover]);

  const hardReload = useCallback(() => {
    hardNavigateReload('clerk-manual-reload');
  }, []);

  return { stuck, hardReload };
}
