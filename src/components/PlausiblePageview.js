import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router is a SPA — Plausible only auto-tracks the first full page load.
 * Fire a pageview on each client-side route change (skip the initial mount).
 */
const PlausiblePageview = () => {
  const location = useLocation();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof window.plausible === 'function') {
      window.plausible('pageview');
    }
  }, [location.pathname, location.search]);

  return null;
};

export default PlausiblePageview;