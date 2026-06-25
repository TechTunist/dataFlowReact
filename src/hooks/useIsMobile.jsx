import { useBreakpoint } from './useBreakpoint';

/** True when viewport ≤1024px (phones + tablets). Used for drawer sidebar and shell layout. */
function useIsMobile() {
  const { isMobile } = useBreakpoint();
  return isMobile;
}

export default useIsMobile;