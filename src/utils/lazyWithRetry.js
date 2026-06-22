import { lazy } from 'react';
import { isChunkLoadError } from './isChunkLoadError';
import { reloadOnce } from './reloadOnce';

const CHUNK_RETRY_DELAY_MS = 400;

function retryDynamicImport(importFn, attempt = 0) {
  return importFn().catch((error) => {
    if (!isChunkLoadError(error)) {
      throw error;
    }
    if (attempt < 1) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, CHUNK_RETRY_DELAY_MS);
      }).then(() => retryDynamicImport(importFn, attempt + 1));
    }
    reloadOnce('lazy-chunk-load-failed');
    throw error;
  });
}

/**
 * React.lazy wrapper that retries once, then reloads on stale chunk errors after deploy.
 */
export function lazyWithRetry(importFn) {
  return lazy(() => retryDynamicImport(importFn));
}