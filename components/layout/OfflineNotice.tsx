"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Says so when the browser reports no connection. Renders nothing otherwise. */
export function OfflineNotice(): React.ReactElement | null {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p role="status" className="notice shell my-4">
      You are offline. Converting needs a connection — reconnect and try again.
    </p>
  );
}
