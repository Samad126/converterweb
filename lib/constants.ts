/**
 * The numbers in the contract that are ours to hold.
 *
 * Everything in here is also true of the server. They are not tuning knobs:
 * each one is stated in the OpenAPI document, and changing one here without
 * changing the service makes the client wrong.
 */

/**
 * 100 MiB, not 100,000,000. The reverse proxy, the multipart parser and this
 * client all apply the same limit, so the check here is a courtesy that saves
 * the upload rather than a rule the server is trusting us to enforce.
 */
export const MAX_UPLOAD_BYTES = 104_857_600;

/**
 * Our own abort deadline.
 *
 * The server's deadline is 90 s, after which it answers `504` with a sentence
 * of its own. Ours is deliberately longer so that the server's answer wins: a
 * client that aborted at 90 s would race the server's own timeout and turn a
 * well-explained `504` into "the server could not be reached".
 */
export const CLIENT_ABORT_MS = 120_000;

/**
 * How long the button stays disabled after a `429`.
 *
 * A constant of ours, not a promise from the server: the response says "try
 * again in a moment" and does not say how long a moment is. Thirty seconds is
 * long enough to be polite to a rate limiter and short enough that a person
 * does not think the page has died.
 */
export const RATE_LIMIT_COOLDOWN_MS = 30_000;

/**
 * The one part name the upload may use, repeated once per file. A request
 * with no part under this name is a `400` — see
 * `components/requestBodies/Upload` in the contract. `/convert/{target}`
 * converts every part independently against the same target: one file
 * answers with the target's own media type (or a ZIP, for a `multiple`
 * target), two or more always answer with a ZIP holding one entry per file
 * plus, on any per-file failure, an `errors.json`.
 */
export const UPLOAD_PART_NAME = "files";

/**
 * The most files a single `/convert/{target}` request may carry, and their
 * combined size limit — both enforced by the server (`MAX_CONVERT_FILES`,
 * `MAX_CONVERT_TOTAL_BYTES`) and mirrored here so a request that cannot
 * possibly succeed is refused before it is sent.
 */
export const MAX_CONVERT_FILES = 15;
export const MAX_CONVERT_TOTAL_BYTES = 104_857_600;

/**
 * What the part is declared as, regardless of what the file claims to be.
 *
 * The import filter is chosen from the *filename extension*; the declared type
 * is ignored by the server on purpose, so we send the honest "I am bytes" and
 * let the extension carry the meaning.
 */
export const UPLOAD_PART_TYPE = "application/octet-stream";

/**
 * The media type of an image target's response, whatever its own `mediaType`
 * says. `png` and `jpg` set `multiple: true` in `GET /formats`, and a multiple
 * target always answers with a ZIP of one image per page — even for a one-page
 * source, so that the response type never depends on the page count.
 */
export const ARCHIVE_MEDIA_TYPE = "application/zip";

/** Extension given to an archive download, alongside `ARCHIVE_MEDIA_TYPE`. */
export const ARCHIVE_EXTENSION = ".zip";
