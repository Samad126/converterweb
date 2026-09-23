"use client";

/**
 * `/pdf/page-numbers` — draw a number on every page, starting from `startAt`
 * (default `1`) at `position` (default `bottom-center`).
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/pdf/PdfToolShell";
import type { PdfPart } from "@/lib/api/pdfApi";
import { usePdfFileTool } from "@/lib/pdf/usePdfFileTool";

type Position = "bottom-center" | "bottom-left" | "bottom-right";

const POSITIONS: ReadonlyArray<{ id: Position; label: string }> = [
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom center" },
  { id: "bottom-right", label: "Bottom right" },
];

export function PageNumbersTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/page-numbers");
  const [position, setPosition] = useState<Position>("bottom-center");
  const [startAt, setStartAt] = useState("1");

  return (
    <PdfToolShell
      tool={tool}
      onRun={() => {
        const parts: PdfPart[] = [
          { name: "position", value: position },
          { name: "startAt", value: startAt },
        ];
        tool.run(parts);
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Position</legend>
        {POSITIONS.map((option) => (
          <label key={option.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="position"
              value={option.id}
              checked={position === option.id}
              onChange={() => setPosition(option.id)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1">
        <span>Start at</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
          className="input"
        />
      </label>
    </PdfToolShell>
  );
}
