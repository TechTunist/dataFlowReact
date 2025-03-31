import { useState, useEffect } from 'react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check if the device is mobile based on user-agent
    const checkIsMobileDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };

    // Function to check if the viewport width indicates a mobile device
    const checkIsMobileWidth = () => window.innerWidth <= 768;

    // Combine both checks: device is mobile if either the user-agent or width indicates it
    const handleResize = () => {
      const isMobileDevice = checkIsMobileDevice();
      const isMobileWidth = checkIsMobileWidth();
      setIsMobile(isMobileDevice || isMobileWidth);
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