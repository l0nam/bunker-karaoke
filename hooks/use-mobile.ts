import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
