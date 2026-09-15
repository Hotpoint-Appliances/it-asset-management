"use client";

import * as React from "react";
import { createPortal } from "react-dom";

function subscribe() {
  return () => {};
}

/** `useSyncExternalStore` (server snapshot `false`, client snapshot `true`) rather than a
 * mount-effect + `setState`, so no cascading re-render is needed just to flip a mounted flag. */
function useMounted() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(children, document.body);
}
