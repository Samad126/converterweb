"use client";

/**
 * `/pdf/compress` — recompress a PDF to shrink it.
 *
 * `level` is a three-way radio (`low`/`medium`/`high`), always sent explicitly
 * rather than relying on the server's `medium` default, so the UI's resting
 * choice and the request always agree with each other.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { formatBytes } from "@/lib/format";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

type Level = "low" | "medium" | "high";

const LEVELS: ReadonlyArray<{ id: Level; label: string; hint: string }> = [
  { id: "low", label: "Low", hint: "Close to lossless; images are not re-encoded." },
  { id: "medium", label: "Medium", hint: "Larger images re-encoded as JPEG where smaller." },
  { id: "high", label: "High", hint: "Same as medium, with no minimum image size." },
];

export function CompressTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/compress");
  const [level, setLevel] = useState<Level>("medium");

  return (
    <PdfToolShell tool={tool} onRun={() => tool.run([{ name: "level", value: level }])}>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Compression level</legend>
        {LEVELS.map((option) => (
          <label key={option.id} className="flex items-start gap-2">
            <input
              type="radio"
              name="level"
              value={option.id}
              checked={level === option.id}
              onChange={() => setLevel(option.id)}
            />
            <span>
              <span className="font-semibold">{option.label}</span>{" "}
              <span className="meta">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {tool.file ? (
        <p className="meta">Original size: {formatBytes(tool.file.size)}</p>
      ) : null}
    </PdfToolShell>
  );
}
