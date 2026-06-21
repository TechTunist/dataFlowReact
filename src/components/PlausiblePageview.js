import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Track SPA navigations after the initial Plausible boot pageview. */
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
      window.plausible('pageview', { u: window.location.href });
    }
  }, [location.pathname, location.search]);

  return null;
};

export default PlausiblePageview;