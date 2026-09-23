"use client";

/**
 * `/pdf/compare` — exactly two PDFs in, a page-by-page text diff back. No
 * download: the result is rendered directly, never a PDF blob.
 */
import { DropZone } from "@/components/ui/DropZone";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { HealthNote } from "@/components/converter/HealthNote";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { recoveryFor } from "@/lib/api/errors";
import { formatBytes } from "@/lib/format";
import { usePdfCompareTool, type CompareDiffChunk } from "@/lib/pdf/usePdfCompareTool";
import { useServiceHealth } from "@/lib/converter/useServiceHealth";

export function CompareTool(): React.ReactElement {
  const tool = usePdfCompareTool();
  const { phase } = tool;
  const { health, healthFailure, recheckHealth } = useServiceHealth();

  if (phase.name === "done") {
    return (
      <div className="flex flex-col gap-6">
        <CompareResultView result={phase.result} />
        <button type="button" className="btn-quiet" onClick={tool.reset}>
          Compare different files
        </button>
      </div>
    );
  }

  return (
    <>
      {health === "unavailable" && healthFailure !== null ? (
        <HealthNote failure={healthFailure} onRetry={recheckHealth} />
      ) : null}

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="step-heading">
            <span className="step-number">1</span> Choose two PDFs
          </h2>
          <p className="meta">Exactly two files — the first is &ldquo;A&rdquo;, the second &ldquo;B&rdquo;.</p>

          {tool.files.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {tool.files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="chosen-file">
                  <span className="file-name">
                    {index === 0 ? "A" : "B"}. {file.name}
                  </span>
                  <span className="meta">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => tool.removeFile(index)}
                    disabled={phase.name === "running"}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          ) : null}

          {tool.fileErrors.length > 0 ? (
            <ul className="flex flex-col gap-1" role="alert">
              {tool.fileErrors.map((message, index) => (
                <li key={index} className="notice">
                  {message}
                </li>
              ))}
            </ul>
          ) : null}

          {tool.files.length < 2 ? (
            <DropZone
              id="pdf-compare-file"
              accept=".pdf"
              acceptedLabel=".pdf"
              limitLabel={formatBytes(MAX_UPLOAD_BYTES)}
              disabled={phase.name === "running"}
              onSelect={(file) => tool.addFiles([file])}
              multiple
            />
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="step-heading">
            <span className="step-number">2</span> Run
          </h2>
          <button type="button" className="btn" onClick={tool.run} disabled={!tool.canRun || health !== "ready"}>
            {phase.name === "running" ? "Comparing…" : "Compare"}
          </button>
        </section>

        {phase.name === "failed" ? (
          <ErrorNote
            failure={phase.failure}
            recovery={recoveryFor(phase.failure)}
            cooldownRemainingMs={0}
            onAction={tool.reset}
          />
        ) : null}
      </div>
    </>
  );
}

function CompareResultView({
  result,
}: {
  result: import("@/lib/pdf/usePdfCompareTool").CompareResult;
}): React.ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <p className="meta">
        A: {result.pageCountA} page{result.pageCountA === 1 ? "" : "s"} · B: {result.pageCountB} page
        {result.pageCountB === 1 ? "" : "s"}
      </p>

      {result.pages.map((page) => (
        <div key={page.page} className="panel">
          <h3 className="font-semibold">Page {page.page}</h3>
          {page.equal ? (
            <p className="meta">No changes.</p>
          ) : (
            <ul className="flex flex-col gap-1 mt-2">
              {(page.diff ?? []).map((chunk, index) => (
                <DiffChunkView key={index} chunk={chunk} />
              ))}
            </ul>
          )}
        </div>
      ))}

      {result.extraPagesInA.length > 0 ? (
        <p className="meta">
          Page{result.extraPagesInA.length === 1 ? "" : "s"} {result.extraPagesInA.join(", ")} only{" "}
          {result.extraPagesInA.length === 1 ? "exists" : "exist"} in the first document.
        </p>
      ) : null}
      {result.extraPagesInB.length > 0 ? (
        <p className="meta">
          Page{result.extraPagesInB.length === 1 ? "" : "s"} {result.extraPagesInB.join(", ")} only{" "}
          {result.extraPagesInB.length === 1 ? "exists" : "exist"} in the second document.
        </p>
      ) : null}
    </section>
  );
}

function DiffChunkView({ chunk }: { chunk: CompareDiffChunk }): React.ReactElement {
  if (chunk.op === "equal") {
    return <li className="meta">{(chunk.a ?? chunk.b ?? []).join(" ")}</li>;
  }
  if (chunk.op === "delete") {
    return (
      <li>
        <span className="text-red-600 line-through">{(chunk.a ?? []).join(" ")}</span>
      </li>
    );
  }
  if (chunk.op === "insert") {
    return (
      <li>
        <span className="text-green-700">{(chunk.b ?? []).join(" ")}</span>
      </li>
    );
  }
  // replace
  return (
    <li className="flex flex-col">
      <span className="text-red-600 line-through">{(chunk.a ?? []).join(" ")}</span>
      <span className="text-green-700">{(chunk.b ?? []).join(" ")}</span>
    </li>
  );
}
