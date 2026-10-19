/**
 * The file tool on an `/audio/*` page, after its run was moved onto the shared
 * job runner. These are the behaviours that must not have moved: a file is
 * needed before Convert works, the job is polled to `done`, and the download
 * is named by the service.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { MediaConvertTool } from "@/components/media/MediaConvertTool";
import { findMediaEntry } from "@/lib/media/mediaCatalog";

import { BASE } from "../msw/handlers";
import { server } from "../msw/server";
import { dropFile } from "../helpers";

function fileInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
}

describe("a file tool on an audio page", () => {
  it("keeps Convert off until a file of the accepted kind is chosen", async () => {
    render(<MediaConvertTool entry={findMediaEntry("audio", "wav_to_mp3")!} />);
    const convert = await screen.findByRole("button", { name: "Convert" });
    await waitFor(() => expect(convert).toBeDisabled());
    expect(screen.getByRole("heading", { name: /Choose a \.wav file/ })).toBeInTheDocument();
  });

  it("uploads the file, waits for the job, and downloads it under the name the service gives", async () => {
    let uploads = 0;
    let polls = 0;
    server.use(
      http.post(`${BASE}/media/mp3`, () => {
        uploads += 1;
        return HttpResponse.json({ id: "job-2", status: "queued", statusUrl: "/media/jobs/job-2" }, { status: 202 });
      }),
      http.get(`${BASE}/media/jobs/job-2`, () => {
        polls += 1;
        return polls === 1
          ? HttpResponse.json({ id: "job-2", status: "running", target: "mp3" })
          : HttpResponse.json({
              id: "job-2",
              status: "done",
              target: "mp3",
              downloadUrl: "/media/jobs/job-2/download",
              bytes: 4,
            });
      }),
      http.get(`${BASE}/media/jobs/job-2/download`, () =>
        new HttpResponse("mp3!", {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": 'attachment; filename="clip.mp3"',
          },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<MediaConvertTool entry={findMediaEntry("audio", "wav_to_mp3")!} />);
    const convert = await screen.findByRole("button", { name: "Convert" });

    await user.upload(fileInput(), new File(["RIFF"], "clip.wav", { type: "audio/wav" }));
    await waitFor(() => expect(convert).toBeEnabled());
    await user.click(convert);

    expect(await screen.findByRole("heading", { name: "clip.mp3" }, { timeout: 5000 })).toBeInTheDocument();
    expect(uploads).toBe(1);
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("download", "clip.mp3");
  });

  it("refuses a file of the wrong kind before anything is uploaded", async () => {
    render(<MediaConvertTool entry={findMediaEntry("audio", "wav_to_mp3")!} />);
    await screen.findByRole("button", { name: "Convert" });

    // Dropped rather than chosen, so the input's `accept` filter does not hide the file first.
    dropFile("notes.txt");

    expect(await screen.findByRole("alert")).toHaveTextContent("notes.txt is a .txt file, which this tool does not accept.");
  });
});
