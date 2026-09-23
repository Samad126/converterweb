import { describe, expect, it } from "vitest";

import {
  OUR_MESSAGES,
  cancelledFailure,
  failureFromResponse,
  fallbackMessage,
  mediaTypeMismatchFailure,
  networkFailure,
  readErrorMessage,
  recoveryFor,
  rejectedFailure,
  showsFormatPicker,
  timedOutFailure,
  unreadableResponseFailure,
} from "@/lib/api/errors";

describe("reading the envelope", () => {
  it("reads error.message and error.code", () => {
    expect(
      readErrorMessage(
        JSON.stringify({
          error: { code: "E_ENCRYPTED", message: "This document is password protected." },
        }),
      ),
    ).toEqual({ message: "This document is password protected.", code: "E_ENCRYPTED" });
  });

  it("returns null for anything that is not the envelope", () => {
    // An HTML page from a reverse proxy. None of it may reach the screen.
    expect(readErrorMessage("<!doctype html><html><body>413</body></html>")).toBeNull();
    expect(readErrorMessage("<html>")).toBeNull();
    expect(readErrorMessage("")).toBeNull();
    expect(readErrorMessage("   ")).toBeNull();
    // Valid JSON, wrong shape.
    expect(readErrorMessage('{"message":"close enough"}')).toBeNull();
    expect(readErrorMessage('{"error":"nope"}')).toBeNull();
    expect(readErrorMessage('{"error":{}}')).toBeNull();
    expect(readErrorMessage('{"error":{"message":""}}')).toBeNull();
    expect(readErrorMessage('{"error":{"message":"   "}}')).toBeNull();
    // Valid JSON that is not an object at all.
    expect(readErrorMessage("42")).toBeNull();
    expect(readErrorMessage("null")).toBeNull();
    expect(readErrorMessage('"a string"')).toBeNull();
  });

  it("keeps an unknown code rather than pretending to recognise it", () => {
    expect(readErrorMessage('{"error":{"code":"E_FROM_THE_FUTURE","message":"Hi."}}')).toEqual({
      message: "Hi.",
      code: "E_FROM_THE_FUTURE",
    });
    expect(readErrorMessage('{"error":{"message":"Hi."}}')).toEqual({
      message: "Hi.",
      code: null,
    });
  });
});

describe("turning a response into a failure", () => {
  it("shows the server's sentence exactly as it arrived", () => {
    const message = "A .docx file can be converted to: PDF, ODT, TXT, HTML, RTF, EPUB.";
    const failure = failureFromResponse(
      415,
      JSON.stringify({ error: { code: "E_UNSUPPORTED_TARGET", message } }),
      "req-1",
    );

    // Not trimmed, not prefixed, not capitalised, not reworded.
    expect(failure.message).toBe(message);
    expect(failure.status).toBe(415);
    expect(failure.kind).toBe("http");
    expect(failure.requestId).toBe("req-1");
    expect(failure.code).toBe("E_UNSUPPORTED_TARGET");
  });

  it("falls back to HTTP <status> for a body it cannot read", () => {
    for (const status of [400, 404, 413, 415, 422, 429, 500, 503, 504]) {
      expect(failureFromResponse(status, "<html>proxy</html>", null).message).toBe(`HTTP ${status}`);
      expect(failureFromResponse(status, "", null).message).toBe(`HTTP ${status}`);
    }
    expect(fallbackMessage(500)).toBe("HTTP 500");
  });

  it("carries no request id when the proxy stripped it", () => {
    expect(failureFromResponse(500, "{}", null).requestId).toBeNull();
  });
});

describe("our own sentences", () => {
  it("are used only where there is no server sentence", () => {
    expect(networkFailure().message).toBe("The server could not be reached.");
    expect(timedOutFailure().message).toBe(
      "The conversion took too long and was cancelled.",
    );
    expect(cancelledFailure().message).toBe("The conversion was cancelled.");
    expect(mediaTypeMismatchFailure(null).message).toBe(
      "The converter returned an unexpected file type.",
    );
    expect(unreadableResponseFailure(200, null).message).toBe(
      "The converter sent a reply this app could not read.",
    );

    // The two that the brief fixes word for word.
    expect(OUR_MESSAGES.timedOut).toBe("The conversion took too long and was cancelled.");
    expect(OUR_MESSAGES.network).toBe("The server could not be reached.");
  });

  it("never wraps a server sentence in one of ours", () => {
    const failure = failureFromResponse(
      500,
      JSON.stringify({ error: { code: "E_CONVERT_FAILED", message: "This document could not be converted." } }),
      null,
    );
    for (const ours of Object.values(OUR_MESSAGES)) {
      expect(failure.message).not.toContain(ours);
    }
  });
});

describe("choosing the way out", () => {
  it("maps each status to the one action the state offers", () => {
    const at = (status: number) => recoveryFor(failureFromResponse(status, "", null));

    expect(at(400)).toBe("retry");
    // The target does not exist: this build's matrix is stale, so start again.
    expect(at(404)).toBe("start-over");
    expect(at(413)).toBe("retry");
    // A real target this source cannot reach: change the format, keep the file.
    expect(at(415)).toBe("choose-format");
    // A password cannot be guessed by trying again.
    expect(at(422)).toBe("different-file");
    expect(at(429)).toBe("cooldown");
    expect(at(500)).toBe("retry");
    expect(at(503)).toBe("retry");
    expect(at(504)).toBe("retry");
  });

  it("maps the failures with no status to a plain retry", () => {
    expect(recoveryFor(networkFailure())).toBe("retry");
    expect(recoveryFor(timedOutFailure())).toBe("retry");
    expect(recoveryFor(cancelledFailure())).toBe("retry");
    expect(recoveryFor(mediaTypeMismatchFailure(null))).toBe("retry");
  });

  it("sends a refusal to a different file, and never to a retry", () => {
    const refusal = rejectedFailure("huge.docx is 25 MB.");
    expect(recoveryFor(refusal)).toBe("different-file");
    // A refusal never reached the server, so there is no status to lean on —
    // and the default would have been a retry of the same refused file.
    expect(refusal.status).toBe(0);
  });

  it("knows which failures mean the matrix has to be re-read", () => {
    expect(showsFormatPicker(failureFromResponse(404, "", null))).toBe(true);
    expect(showsFormatPicker(failureFromResponse(415, "", null))).toBe(true);
    expect(showsFormatPicker(failureFromResponse(500, "", null))).toBe(false);
    expect(showsFormatPicker(networkFailure())).toBe(false);
  });
});
