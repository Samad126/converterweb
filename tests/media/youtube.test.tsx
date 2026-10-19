/**
 * The YouTube page's tool, against MSW. A link goes to `POST /youtube/{target}`
 * as JSON, the job is polled and downloaded through the shared
 * `/media/jobs/{id}` endpoints, and every failure is shown as the service
 * worded it.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, delay, http } from "msw";
import { describe, expect, it } from "vitest";

import { YouTubeConvertTool } from "@/components/media/YouTubeConvertTool";
import { youtubeEntryFor } from "@/lib/media/youtubeCatalog";

import { BASE, envelope } from "../msw/handlers";
import { server } from "../msw/server";

const LINK = "https://youtu.be/jNQXAC9IVRw";
const DOWNLOAD_DISPOSITION = `attachment; filename="Test video.mp3"; filename*=UTF-8''Test%20video.mp3`;

function acceptedJob(id = "job-1") {
  return HttpResponse.json({ id, status: "queued", statusUrl: `/media/jobs/${id}` }, { status: 202 });
}

function renderTool(target: "mp3" | "mp4" = "mp3") {
  const user = userEvent.setup();
  render(<YouTubeConvertTool entry={youtubeEntryFor(target)} />);
  return user;
}

function linkField(): HTMLInputElement {
  return screen.getByLabelText("YouTube video link") as HTMLInputElement;
}

/** Paste a link and wait until Convert is allowed to run, which needs the service to answer `/health`. */
async function pasteAndConvert(user: ReturnType<typeof userEvent.setup>, link: string) {
  await user.type(linkField(), link);
  const convert = screen.getByRole("button", { name: "Convert" });
  await waitFor(() => expect(convert).toBeEnabled());
  await user.click(convert);
}

describe("the YouTube tool", () => {
  it("keeps Convert off until a link is pasted", async () => {
    const user = renderTool();
    const convert = await screen.findByRole("button", { name: "Convert" });
    expect(convert).toBeDisabled();

    await user.type(linkField(), LINK);
    await waitFor(() => expect(convert).toBeEnabled());
  });

  it("sends the link trimmed and as typed, then downloads the video once the job is done", async () => {
    let sentBody: unknown = null;
    let polls = 0;
    server.use(
      http.post(`${BASE}/youtube/mp3`, async ({ request }) => {
        sentBody = await request.json();
        return acceptedJob();
      }),
      http.get(`${BASE}/media/jobs/job-1`, () => {
        polls += 1;
        return polls === 1
          ? HttpResponse.json({ id: "job-1", status: "running", target: "mp3" })
          : HttpResponse.json({
              id: "job-1",
              status: "done",
              target: "mp3",
              downloadUrl: "/media/jobs/job-1/download",
              bytes: 11,
            });
      }),
      http.get(`${BASE}/media/jobs/job-1/download`, () =>
        new HttpResponse("audio-bytes", {
          headers: { "Content-Type": "audio/mpeg", "Content-Disposition": DOWNLOAD_DISPOSITION },
        }),
      ),
    );

    const user = renderTool();
    await pasteAndConvert(user, `  ${LINK}  `);

    expect(await screen.findByRole("button", { name: "Converting…" })).toBeDisabled();
    expect(await screen.findByRole("heading", { name: "Test video.mp3" }, { timeout: 5000 })).toBeInTheDocument();
    expect(sentBody).toEqual({ url: LINK });

    const download = screen.getByRole("link", { name: "Download" });
    expect(download.getAttribute("href")).toMatch(/^blob:/);
    expect(download).toHaveAttribute("download", "Test video.mp3");
  });

  it("runs on Enter in the link field, as every form on the site does", async () => {
    let posted = false;
    server.use(
      http.post(`${BASE}/youtube/mp3`, () => {
        posted = true;
        return acceptedJob();
      }),
      http.get(`${BASE}/media/jobs/job-1`, () =>
        HttpResponse.json({
          id: "job-1",
          status: "done",
          target: "mp3",
          downloadUrl: "/media/jobs/job-1/download",
          bytes: 3,
        }),
      ),
      http.get(`${BASE}/media/jobs/job-1/download`, () =>
        new HttpResponse("abc", {
          headers: { "Content-Type": "audio/mpeg", "Content-Disposition": DOWNLOAD_DISPOSITION },
        }),
      ),
    );

    const user = renderTool();
    await user.type(linkField(), LINK);
    await waitFor(() => expect(screen.getByRole("button", { name: "Convert" })).toBeEnabled());
    await user.type(linkField(), "{Enter}");

    await waitFor(() => expect(posted).toBe(true));
  });

  it("shows the service's sentence for a link it does not accept, then offers a different link", async () => {
    server.use(
      http.post(`${BASE}/youtube/mp3`, () =>
        envelope(400, "E_INVALID_FIELD", "That is not a YouTube video link."),
      ),
    );

    const user = renderTool();
    await pasteAndConvert(user, "https://example.com/not-a-video");

    expect(await screen.findByText("That is not a YouTube video link.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try a different link" }));

    expect(screen.queryByText("That is not a YouTube video link.")).not.toBeInTheDocument();
    expect(linkField()).toHaveFocus();
    expect(linkField()).toHaveValue("https://example.com/not-a-video");
  });

  it("clears a failure as soon as the link is edited, so Convert is usable again", async () => {
    server.use(
      http.post(`${BASE}/youtube/mp3`, () =>
        envelope(400, "E_INVALID_FIELD", "That is not a YouTube video link."),
      ),
    );

    const user = renderTool();
    await pasteAndConvert(user, "https://example.com/not-a-video");
    expect(await screen.findByText("That is not a YouTube video link.")).toBeInTheDocument();

    await user.type(linkField(), "{Backspace}");

    expect(screen.queryByText("That is not a YouTube video link.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert" })).toBeEnabled();
  });

  it.each([
    ["E_VIDEO_UNAVAILABLE", "This video is private, removed, age-restricted, or not available in this country."],
    ["E_TOO_LARGE", "This video is larger than the 200 MB limit."],
  ])(
    "says why a job failed (%s) and offers a different link, not a retry that cannot succeed",
    async (code, message) => {
      server.use(
        http.post(`${BASE}/youtube/mp3`, () => acceptedJob()),
        // A failed job answers `200` on the status endpoint; only `error.code` says what went wrong.
        http.get(`${BASE}/media/jobs/job-1`, () =>
          HttpResponse.json({ id: "job-1", status: "failed", target: "mp3", error: { code, message } }),
        ),
      );

      const user = renderTool();
      await pasteAndConvert(user, LINK);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try a different link" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    },
  );

  it("cancels a request that is still waiting for the service to accept the link", async () => {
    server.use(
      http.post(`${BASE}/youtube/mp3`, async () => {
        await delay("infinite");
        return acceptedJob();
      }),
    );

    const user = renderTool();
    await pasteAndConvert(user, LINK);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("The conversion was cancelled.")).toBeInTheDocument();
  });

  it("points the MP4 page at the MP4 target", async () => {
    let target: string | null = null;
    server.use(
      http.post(`${BASE}/youtube/:target`, ({ params }) => {
        target = String(params.target);
        return envelope(400, "E_INVALID_FIELD", "That is not a YouTube video link.");
      }),
    );

    const user = renderTool("mp4");
    await pasteAndConvert(user, LINK);

    await waitFor(() => expect(target).toBe("mp4"));
  });
});
