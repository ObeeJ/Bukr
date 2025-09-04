// src/hooks/useIsMobile.tsx

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    handleResize();

    // Use ResizeObserver for more efficient updates
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.body);

    // Fallback to window.matchMedia for older browsers
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", handleResize);

    return () => {
      observer.disconnect();
      mql.removeEventListener("change", handleResize);
    };
  }, []);

  return isMobile;
}