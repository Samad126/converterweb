"use client";

/**
 * `GET /health`, for the `/pdf/*` tools and `/tools/*` pages.
 *
 * `useConverter.ts` already probes health for the conversion pages; this is
 * the same probe, standalone, for the surfaces that don't go through that
 * hook — `PdfToolShell`, `PdfMultiToolShell`, `CompareTool` and
 * `FormFieldsTool` had no health check at all, so a down service was only
 * ever discovered by running a tool and reading the resulting `ErrorNote`,
 * rather than upfront the way a conversion page already shows it.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { checkHealth } from "../api/api";
import type { Failure } from "../api/errors";

export type HealthState = "checking" | "ready" | "unavailable";

export interface ServiceHealth {
  health: HealthState;
  healthFailure: Failure | null;
  recheckHealth: () => void;
}

export function useServiceHealth(): ServiceHealth {
  const [health, setHealth] = useState<HealthState>("checking");
  const [healthFailure, setHealthFailure] = useState<Failure | null>(null);
  const mountedRef = useRef(true);

  const probeHealth = useCallback((): void => {
    void checkHealth()
      .then((result) => {
        if (!mountedRef.current) return;
        setHealth(result.ok ? "ready" : "unavailable");
        setHealthFailure(result.ok ? null : result.failure);
      })
      .catch(() => {
        // Only an abort lands here, and an abort means this component is gone.
      });
  }, []);

  const recheckHealth = useCallback((): void => {
    setHealth("checking");
    setHealthFailure(null);
    void probeHealth();
  }, [probeHealth]);

  useEffect(() => {
    mountedRef.current = true;
    void probeHealth();
    return () => {
      mountedRef.current = false;
    };
  }, [probeHealth]);

  return { health, healthFailure, recheckHealth };
}
