/**
 * Centralized Clerk token management for data fetching.
 *
 * This allows non-React code (like DataContext.fetchWithCache) to
 * obtain the current user's Clerk JWT without direct hook access.
 */

let getTokenFn = null;

export function setClerkTokenGetter(fn) {
  getTokenFn = fn;
}

export async function getClerkToken() {
  if (typeof getTokenFn !== 'function') {
    return null;
  }
  try {
    const token = await getTokenFn();
    return token || null;
  } catch (error) {
    // Silent fail - user might not be signed in or token fetch failed
    return null;
  }
}
