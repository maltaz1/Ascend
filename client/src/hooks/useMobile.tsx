import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const isBrowser = typeof window !== "undefined";

  const getInitial = () => (isBrowser ? window.innerWidth < MOBILE_BREAKPOINT : false);

  const [isMobile, setIsMobile] = React.useState<boolean>(getInitial);

  React.useEffect(() => {
    if (!isBrowser) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);

    // Modern browsers support addEventListener on MediaQueryList
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange as any);
    } else if (typeof mql.addListener === "function") {
      // Safari fallback
      (mql as any).addListener(onChange);
    }

    // sync initial
    setIsMobile(mql.matches);

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange as any);
      } else if (typeof mql.removeListener === "function") {
        (mql as any).removeListener(onChange);
      }
    };
  }, [isBrowser]);

  return isMobile;
}
