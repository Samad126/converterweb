"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onTick` every `intervalMs` while `active` is true.
 *
 * The one copy of the "elapsed timer" the converter and every tool hook used to
 * carry. `onTick` is read through a ref, so passing a fresh closure each render
 * does not restart the interval.
 */
export function useTicker(active: boolean, onTick: () => void, intervalMs = 100): void {
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  });

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tick.current(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
