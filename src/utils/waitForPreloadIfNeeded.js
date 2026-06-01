/**
 * waitForPreloadIfNeeded
 *
 * Phase 1 (audit remediation / data layer professionalization)
 *
 * If the app's initial preload is still running, wait briefly and then
 * re-check whether the requested data has already been populated.
 *
 * This eliminates a common source of duplicate network requests and race
 * conditions between eager preload and demand-loaded chart fetches.
 *
 * Pure utility with zero dependencies — safe to import from DataContext.
 */
export async function waitForPreloadIfNeeded(preloadComplete, isAlreadyFetchedFn) {
  if (preloadComplete) {
    return false;
  }

  // Short grace period to let the preload finish its work
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Re-evaluate after waiting
  return isAlreadyFetchedFn();
}
