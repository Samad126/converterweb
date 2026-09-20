"use client";

/**
 * `/pdf/form-fields` + `/pdf/fill-form` — the one two-step `/pdf/*` tool: list
 * a PDF's AcroForm fields, then fill only the ones the person touched. The
 * file is kept in state and never re-uploaded for the fill step.
 */
import { useState } from "react";

import { DropZone } from "@/components/DropZone";
import { ErrorNote } from "@/components/ErrorNote";
import { HealthNote } from "@/components/HealthNote";
import { CheckIcon, DownloadIcon } from "@/components/Icons";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { recoveryFor } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { usePdfFormFieldsTool, type FormField } from "@/lib/usePdfFormFieldsTool";
import { useServiceHealth } from "@/lib/useServiceHealth";

export function FormFieldsTool(): React.ReactElement {
  const tool = usePdfFormFieldsTool();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);
  const { phase } = tool;
  const { health, healthFailure, recheckHealth } = useServiceHealth();

  if (phase.name === "done") {
    return (
      <section className="panel-strong" aria-labelledby="pdf-result-heading">
        <span className="chip-inverse">
          <CheckIcon size={12} />
          <span className="eyebrow">Done</span>
        </span>
        <h2 id="pdf-result-heading" className="file-name text-xl font-bold tracking-tight mt-4">
          {phase.result.filename}
        </h2>
        <p className="meta mt-2">{formatBytes(phase.result.byteSize)}</p>
        <a className="btn btn-inverse mt-5" href={phase.result.downloadUrl} download={phase.result.filename}>
          <DownloadIcon size={18} />
          Download
        </a>
        <div className="mt-3">
          <button type="button" className="btn-quiet" onClick={tool.reset}>
            Start over
          </button>
        </div>
      </section>
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
            <span className="step-number">1</span> Choose a PDF
          </h2>

          {tool.file ? (
            <div className="chosen-file">
              <span className="file-name">{tool.file.name}</span>
              <span className="meta">{formatBytes(tool.file.size)}</span>
              <button
                type="button"
                className="btn-quiet"
                onClick={tool.clearFile}
                disabled={phase.name === "listing" || phase.name === "filling"}
              >
                Remove
              </button>
            </div>
          ) : (
            <DropZone
              id="pdf-form-fields-file"
              accept=".pdf"
              acceptedLabel=".pdf"
              limitLabel={formatBytes(MAX_UPLOAD_BYTES)}
              disabled={false}
              onSelect={tool.selectFile}
            />
          )}

          {tool.fileError ? (
            <ul className="flex flex-col gap-1" role="alert">
              <li className="notice">{tool.fileError}</li>
            </ul>
          ) : null}
        </section>

        {tool.file && phase.name === "ready" ? (
          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">2</span> Read the form
            </h2>
            <button type="button" className="btn" onClick={tool.list} disabled={health !== "ready"}>
              Read form fields
            </button>
          </section>
        ) : null}

        {phase.name === "listing" ? <p className="meta">Reading the form…</p> : null}

        {phase.name === "listed" && phase.fields.length === 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">2</span> Fields
            </h2>
            <p className="meta">This PDF has no fillable form fields.</p>
          </section>
        ) : null}

        {phase.name === "listed" && phase.fields.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="step-heading">
              <span className="step-number">2</span> Fields
            </h2>
            {phase.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                onChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
              />
            ))}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(event) => setFlatten(event.target.checked)}
              />
              <span>Flatten — bake the values in and remove the fields</span>
            </label>

            <button
              type="button"
              className="btn"
              onClick={() => tool.fill(values, flatten)}
              disabled={Object.keys(values).length === 0 || health !== "ready"}
            >
              Fill form
            </button>
          </section>
        ) : null}

        {phase.name === "filling" ? <p className="meta">Filling the form…</p> : null}

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

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}): React.ReactElement | null {
  const label = field.name;

  if (field.type === "text") {
    return (
      <label className="flex flex-col gap-1">
        <span>{label}</span>
        <input
          type="text"
          className="input"
          defaultValue={typeof field.value === "string" ? field.value : ""}
          onChange={(event) => onChange(event.target.value)}
          value={typeof value === "string" ? value : undefined}
        />
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          defaultChecked={field.value === true}
          checked={typeof value === "boolean" ? value : field.value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (field.type === "radio" || field.type === "dropdown" || field.type === "optionList") {
    return (
      <label className="flex flex-col gap-1">
        <span>{label}</span>
        <select
          className="input"
          value={typeof value === "string" ? value : (typeof field.value === "string" ? field.value : "")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            Choose…
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // `button`/`unknown` fields have nothing to fill.
  return null;
}
