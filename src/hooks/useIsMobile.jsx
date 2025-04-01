import { useState, useEffect } from 'react';
import { isMobile as isMobileDevice } from 'react-device-detect';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(isMobileDevice);

  useEffect(() => {
    // Function to check if the viewport width indicates a mobile device
    const checkIsMobileWidth = () => {
      const width = window.innerWidth;
      // console.log("window.innerWidth:", width);
      const isMobileWidth = width <= 1024;
      // console.log("checkIsMobileWidth:", isMobileWidth);
      return isMobileWidth;
    };

    // Fallback: Use window.matchMedia to check for mobile screen size
    const checkIsMobileMediaQuery = () => {
      const isMobileMedia = window.matchMedia("(max-width: 1024px)").matches;
      // console.log("checkIsMobileMediaQuery:", isMobileMedia);
      return isMobileMedia;
    };

    // Combine all checks: device is mobile if any condition is true
    const handleResize = () => {
      const isMobileWidth = checkIsMobileWidth();
      const isMobileMedia = checkIsMobileMediaQuery();
      const result = isMobileDevice || isMobileWidth || isMobileMedia;
      // console.log("isMobileDevice (react-device-detect):", isMobileDevice);
      // console.log("isMobile (final):", result);
      setIsMobile(result);
    };

    // Initial check
    handleResize();

    // Add event listeners for resize and orientation change
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;