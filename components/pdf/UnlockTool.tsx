"use client";

/**
 * `/pdf/unlock` — decrypt a PDF using `password`. A password that does not
 * open the file is refused with the server's own `E_WRONG_PASSWORD` sentence.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function UnlockTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/unlock");
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
          autoComplete="current-password"
        />
      </label>
      <p className="meta">The password that opens the file.</p>
    </PdfToolShell>
  );
}
