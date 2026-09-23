"use client";

/**
 * The discreet note for a service that is not answering.
 *
 * The service only starts listening once LibreOffice, the rasteriser and the
 * fonts have all been verified and a warm-up conversion has succeeded for every
 * document family — so reaching `/health` at all means the whole matrix is
 * ready, and not reaching it means nothing will work yet.
 *
 * When the service explains itself, its sentence is shown untouched. Ours only
 * appears when there is no sentence to show, and it says what is true without
 * speculating about why.
 */
import type { Failure } from "@/lib/api/errors";

import { ClockIcon } from "../ui/Icons";

export interface HealthNoteProps {
  failure: Failure;
  onRetry: () => void;
}

export function HealthNote({ failure, onRetry }: HealthNoteProps): React.ReactElement {
  return (
    <div className="notice mb-8" role="status" aria-live="polite">
      <ClockIcon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{failure.message}</p>
        <button type="button" className="btn-quiet mt-1" onClick={onRetry}>
          Check again
        </button>
      </div>
    </div>
  );
}
