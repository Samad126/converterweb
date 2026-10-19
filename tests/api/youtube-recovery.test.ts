/**
 * Which action a YouTube link's failure offers. The file rules say "try again"
 * for a `200` job failure, which is wrong for a video that is private: the same
 * link fails the same way every time. `recoveryForLink` is the rule that knows that.
 */
import { describe, expect, it } from "vitest";

import { type Failure, networkFailure, recoveryFor, recoveryForLink } from "@/lib/api/errors";

function httpFailure(status: number, code: string | null): Failure {
  return { kind: "http", status, message: "x", requestId: null, code };
}

describe("recoveryForLink", () => {
  it.each([
    ["a private, removed or blocked video (the job's own failure, which answers 200)", httpFailure(200, "E_VIDEO_UNAVAILABLE")],
    ["a video over the size limit (the job's own failure)", httpFailure(200, "E_TOO_LARGE")],
    ["a video over the size limit (refused at the start, 413)", httpFailure(413, "E_TOO_LARGE")],
    ["a video that is unavailable at the start (422)", httpFailure(422, "E_VIDEO_UNAVAILABLE")],
    ["a link the service cannot read (400)", httpFailure(400, "E_INVALID_FIELD")],
  ])("offers a different link for %s", (_, failure) => {
    expect(recoveryForLink(failure)).toBe("different-link");
  });

  it("keeps the cooldown for a busy queue or a rate limit, which clear on their own", () => {
    expect(recoveryForLink(httpFailure(503, "E_BUSY"))).toBe("cooldown");
    expect(recoveryForLink(httpFailure(429, "E_RATE_LIMITED"))).toBe("cooldown");
  });

  it("retries a dropped connection, as the file rules do", () => {
    expect(recoveryForLink(networkFailure())).toBe("retry");
  });

  it("does not change the file rules, which still say different-file for a 413 on a file", () => {
    expect(recoveryFor(httpFailure(413, "E_TOO_LARGE"))).toBe("different-file");
  });
});
