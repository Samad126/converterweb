/**
 * The states around a conversion: is the service ready, what happens while it
 * is working, and what happens when the person or the clock stops it.
 *
 * The cancellation tests are the reason this file reaches past MSW — see
 * `tests/transport/nativeXhr.ts`. MSW's XHR interceptor has no `abort()`, so a
 * cancelled request never reports itself as cancelled, and the Cancel button
 * and the 120 second deadline are both built on exactly that.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, delay, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConverterShell } from "@/components/ConverterShell";
import { CLIENT_ABORT_MS } from "@/lib/constants";

import { BASE, envelope } from "./msw/handlers";
import { MATRIX } from "./msw/matrix";
import { server } from "./msw/server";
import { startServer, withNativeXhr } from "./transport/server";
import { chooseFile, chooseFormat, convertNow, setupPage } from "./helpers";

const MSW_ORIGIN = "http://converter.test";

afterEach(() => {
  process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = MSW_ORIGIN;
  vi.restoreAllMocks();
});

describe("the health probe", () => {
  it("disables conversion and shows the server's own sentence when it is not ok", async () => {
    server.use(
      http.get(`${BASE}/health`, () =>
        envelope(503, "E_BUSY", "The converter is busy. Try again in a moment."),
      ),
    );

    const user = await setupPage();
    await chooseFile(user, "a.docx");

    expect(screen.getByRole("status")).toHaveTextContent(
      "The converter is busy. Try again in a moment.",
    );
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();
  });

  it("says something true of our own when the service cannot be reached", async () => {
    server.use(http.get(`${BASE}/health`, () => HttpResponse.error()));

    await setupPage();

    expect(screen.getByRole("status")).toHaveTextContent("The server could not be reached.");
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();
  });

  it("enables conversion once the service answers, on retry", async () => {
    let healthy = false;
    server.use(
      http.get(`${BASE}/health`, () => {
        if (!healthy) return HttpResponse.error();
        return HttpResponse.json({ status: "ok" });
      }),
    );

    const user = await setupPage();
    expect(screen.getByRole("status")).toHaveTextContent("The server could not be reached.");
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();

    healthy = true;
    await user.click(screen.getByRole("button", { name: "Check again" }));

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    await chooseFile(user, "a.docx");
    await chooseFormat(user, "PDF");
    expect(screen.getByRole("button", { name: "Convert to PDF" })).toBeEnabled();
  });

  it("does not invent a message when the reply is not the one the contract documents", async () => {
    server.use(http.get(`${BASE}/health`, () => HttpResponse.json({ status: "warming up" })));

    await setupPage();
    expect(screen.getByRole("status")).toHaveTextContent(
      "The converter sent a reply this app could not read.",
    );
  });
});

describe("while a conversion is running", () => {
  it("stops saying Uploading once the body is on the wire", async () => {
    // A server that has begun answering and is still working: the response
    // headers have arrived, the body has not. That is the moment the phase
    // stops being about the network and starts being about the conversion.
    //
    // jsdom emits no upload progress events of its own, so this transition is
    // driven here by the readyState half of the same mechanism. The percentage
    // the other half produces is covered in `tests/progress.test.tsx`.
    const server_ = await startServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/pdf" });
      response.write(" ");
    });

    const user = await setupPage();
    await chooseFile(user, "a.docx");
    await chooseFormat(user, "PDF");

    process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = server_.origin;
    try {
      await withNativeXhr(async () => {
        await convertNow(user, "Convert to PDF");

        expect(
          await screen.findByRole("progressbar", { name: "Conversion progress" }),
        ).toBeInTheDocument();
        expect(screen.getAllByText("Converting").length).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      });
    } finally {
      process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = MSW_ORIGIN;
      await server_.close();
    }
  });
});

describe("stopping a conversion", () => {
  /** A real server that accepts the upload and never answers. */
  async function unanswerable(): Promise<() => Promise<void>> {
    const server_ = await startServer(() => {
      // Deliberately never answers.
    });
    process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = server_.origin;
    return server_.close;
  }

  it("cancels on request and says the conversion was cancelled", async () => {
    const user = await setupPage();
    await chooseFile(user, "a.docx");
    await chooseFormat(user, "PDF");

    const close = await unanswerable();
    try {
      await withNativeXhr(async () => {
        await convertNow(user, "Convert to PDF");
        await user.click(await screen.findByRole("button", { name: "Cancel" }));
      });
    } finally {
      process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = MSW_ORIGIN;
      await close();
    }

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The conversion was cancelled.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("gives up at 120 seconds and says the conversion took too long", async () => {
    const user = await setupPage();
    await chooseFile(user, "a.docx");
    await chooseFormat(user, "PDF");

    // The deadline is 120 s and waiting for it is not an option, so the test
    // finds the timer the app armed and fires it. The number it asserts is the
    // contract's, not one the test chose.
    const calls: Array<[() => void, number | undefined]> = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      delay?: number,
    ) => {
      calls.push([handler, delay]);
      return realSetTimeout(handler, delay);
    }) as typeof setTimeout);

    const close = await unanswerable();
    try {
      await withNativeXhr(async () => {
        await convertNow(user, "Convert to PDF");
        // The request is in flight — whichever of the two phases it is in, the
        // page has stopped offering a Convert button and is offering Cancel.
        await screen.findByRole("button", { name: "Cancel" });

        const deadline = calls.find(([, delay]) => delay === CLIENT_ABORT_MS);
        expect(deadline, "no timer armed at CLIENT_ABORT_MS").toBeDefined();
        expect(CLIENT_ABORT_MS).toBe(120_000);
        deadline?.[0]();
      });
    } finally {
      process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = MSW_ORIGIN;
      await close();
    }

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The conversion took too long and was cancelled.");
    // The server's sentence wins when the server answers. This one is ours,
    // because at 120 seconds it had not.
    expect(alert).not.toHaveTextContent("This document took too long to convert.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("loading the matrix", () => {
  it("stands a skeleton in the picker's place, at the picker's height", async () => {
    server.use(
      http.get(`${BASE}/formats`, async () => {
        await delay(150);
        return HttpResponse.json(MATRIX);
      }),
    );

    render(<ConverterShell />);

    // Before the matrix arrives: the same class the loaded picker carries, so
    // the button underneath it does not move when the formats arrive.
    const skeleton = document.querySelector(".picker-region");
    expect(skeleton).not.toBeNull();
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // And afterwards it is still one element of that class, now the picker.
    await screen.findByRole("button", { name: "Convert" });
    expect(document.querySelectorAll(".picker-region")).toHaveLength(1);
    expect(screen.getAllByRole("radio").length).toBe(MATRIX.targets.length);
  });

  it("shows the server's sentence when the matrix itself cannot be loaded", async () => {
    server.use(
      http.get(`${BASE}/formats`, () =>
        envelope(500, "E_INTERNAL", "Something went wrong on the server."),
      ),
    );

    render(<ConverterShell />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on the server.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
