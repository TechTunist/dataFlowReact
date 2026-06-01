/**
 * Centralized Clerk token management for data fetching.
 *
 * This allows non-React code (DataContext, DataService, etc.) to
 * reliably obtain the current user's Clerk JWT.
 *
 * Strategy:
 * 1. Prefer a registered getter (from React components that have Clerk context)
 * 2. Strong fallback to window.Clerk.session.getToken() (works once Clerk is loaded)
 */

let getTokenFn = null;

export function setClerkTokenGetter(fn) {
  getTokenFn = fn;
}

/**
 * Gets a fresh Clerk JWT token.
 * Returns null if the user is not signed in or Clerk is not ready.
 */
export async function getClerkToken() {
  // Preferred path: registered getter from React context
  if (typeof getTokenFn === 'function') {
    try {
      const token = await getTokenFn();
      if (token) return token;
    } catch (err) {
      // Fall through to window.Clerk fallback
    }
  }

  // Very reliable fallback once Clerk has loaded
  try {
    if (window.Clerk?.session) {
      const token = await window.Clerk.session.getToken();
      return token || null;
    }
  } catch (err) {
    // Clerk not ready or no session
  }

  return null;
}

/**
 * Returns true if we currently have a way to obtain a token
 * (either via registered getter or window.Clerk).
 */
export function hasClerkTokenGetter() {
  return typeof getTokenFn === 'function' || !!window.Clerk?.session;
}
