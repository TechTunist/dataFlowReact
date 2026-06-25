import { useState, useEffect } from 'react';

/** Shared layout breakpoints (px). Shell uses isMobile (≤tablet); charts use isPhone for density. */
export const BREAKPOINTS = {
  phone: 600,
  tablet: 1024,
};

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.tablet + 1
  );

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return {
    width,
    isPhone: width <= BREAKPOINTS.phone,
    isTablet: width > BREAKPOINTS.phone && width <= BREAKPOINTS.tablet,
    isMobile: width <= BREAKPOINTS.tablet,
    isDesktop: width > BREAKPOINTS.tablet,
  };
}

export default useBreakpoint;