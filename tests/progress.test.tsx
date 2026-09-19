/**
 * The two phases of a conversion, at the component level.
 *
 * It is a component test rather than an integration test because jsdom emits no
 * upload progress events: its `XMLHttpRequest` never fires `upload.onprogress`
 * or `upload.onload` on a request that is merely in flight, so the determinate
 * half of this meter cannot be driven through it. What the browser does emit is
 * what these props are, so this is where the percentage and the phase labels
 * are checked. `tests/service.test.tsx` covers the transition in context.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProgressMeter } from "@/components/ProgressMeter";

function fill(): HTMLElement {
  const element = document.querySelector<HTMLElement>(".meter-fill");
  if (element === null) throw new Error("no meter fill");
  return element;
}

describe("uploading", () => {
  it("shows a percentage, the bytes moved, and the elapsed time", () => {
    render(
      <ProgressMeter
        stage="uploading"
        loaded={3_145_728}
        total={12_582_912}
        elapsedMs={2_400}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Upload progress" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(fill()).toHaveStyle({ width: "25%" });
    expect(fill()).toHaveAttribute("data-indeterminate", "false");
    expect(screen.getByText(/3 MB of 12 MB/)).toBeInTheDocument();
    expect(screen.getByText(/2\.4 s/)).toBeInTheDocument();
  });

  it("stays indeterminate when the browser cannot compute a total", () => {
    render(
      <ProgressMeter
        stage="uploading"
        loaded={0}
        total={null}
        elapsedMs={500}
        onCancel={() => undefined}
      />,
    );

    const bar = screen.getByRole("progressbar", { name: "Upload progress" });
    // No number is invented when there is nothing to divide by.
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(fill()).toHaveAttribute("data-indeterminate", "true");
    expect(fill()).not.toHaveStyle({ width: "0%" });
  });
});

describe("converting", () => {
  it("is indeterminate, because the server has said nothing", () => {
    render(
      <ProgressMeter
        stage="converting"
        loaded={64}
        total={64}
        elapsedMs={12_300}
        onCancel={() => undefined}
      />,
    );

    // The upload finished; what is happening now is not measurable from here.
    const bar = screen.getByRole("progressbar", { name: "Conversion progress" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(fill()).toHaveAttribute("data-indeterminate", "true");
    expect(screen.getAllByText("Converting").length).toBeGreaterThan(0);
    expect(screen.getByText(/12\.3 s/)).toBeInTheDocument();
  });
});

describe("cancelling", () => {
  it("is the only action offered, and it is reachable by keyboard", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ProgressMeter
        stage="converting"
        loaded={0}
        total={null}
        elapsedMs={0}
        onCancel={onCancel}
      />,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("the live region", () => {
  it("announces the phase, not the numbers that change every frame", () => {
    render(
      <ProgressMeter
        stage="uploading"
        loaded={1_048_576}
        total={2_097_152}
        elapsedMs={1_100}
        onCancel={() => undefined}
      />,
    );

    // The percentage and the timer are marked as decoration so that a screen
    // reader is told "Uploading" once, rather than a hundred times a second.
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("Uploading");
    expect(live).not.toHaveTextContent("%");
  });
});
