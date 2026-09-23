/**
 * Names for the parts of the generated API types we actually use.
 *
 * `lib/api/api-types.ts` is generated from `openapi.json` by `npm run gen:api` and
 * is never edited by hand. This file is the only place that reaches into its
 * shape, so a regeneration that renames something breaks here — loudly, at
 * compile time — rather than in twenty call sites.
 */
import type { components, paths } from "./api-types";

/** The body of every non-2xx response. */
export type ErrorEnvelope = components["schemas"]["ErrorEnvelope"];

/**
 * The stable machine identifier for a failure.
 *
 * Kept for logs and for the shape of the envelope only. The contract is
 * explicit that this is never shown to a person, and nothing in `components/`
 * or `app/` ever receives it.
 */
export type ErrorCode = components["schemas"]["ErrorCode"];

/** Identifier of an output format: the `/convert/{target}` path segment. */
export type TargetId = components["schemas"]["TargetId"];

/** `GET /formats` — the conversion matrix. */
export type FormatsResponse =
  paths["/formats"]["get"]["responses"][200]["content"]["application/json"];

/** One accepted upload type within the matrix. */
export type SourceFormat = FormatsResponse["sources"][number];

/** One producible format within the matrix. */
export type TargetFormat = FormatsResponse["targets"][number];

/** `GET /health`. */
export type HealthResponse =
  paths["/health"]["get"]["responses"][200]["content"]["application/json"];

/** The declared error body of a conversion endpoint, for MSW fixtures and tests. */
export type ConvertErrorResponse =
  paths["/convert/{target}"]["post"]["responses"][400]["content"]["application/json"];
