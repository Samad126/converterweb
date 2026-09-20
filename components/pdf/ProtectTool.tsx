"use client";

/**
 * `/pdf/protect` — encrypt a PDF with `password` as both its user and owner
 * password. Refuses a file that is already encrypted.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function ProtectTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/protect");
  const [password, setPassword] = useState("");

  return (
    <PdfToolShell tool={tool} onRun={() => tool.run([{ name: "password", value: password }])}>
      <label className="flex flex-col gap-1">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input"
          autoComplete="new-password"
        />
      </label>
      <p className="meta">Used as both the user and owner password.</p>
    </PdfToolShell>
  );
}
