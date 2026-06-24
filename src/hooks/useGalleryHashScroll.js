import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const NAVBAR_OFFSET = 96;

/** Scroll to a chart-gallery section when the URL contains a hash (e.g. /chart-gallery#risk). */
export function useGalleryHashScroll() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;

    const scrollToSection = () => {
      const el = document.getElementById(hash);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    // Allow layout to paint section headings before scrolling.
    const timer = window.setTimeout(scrollToSection, 120);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);
}