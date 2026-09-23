/**
 * Keyboard, ARIA and state coverage for the search shell.
 *
 * Renders `ToolSearchView` driven by the real `useToolSearchController` hook
 * against a small fixed item list — no `next/navigation`, no network, so this
 * is testing exactly the interaction contract Phase 2 inherits.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToolSearchView } from "@/components/search/ToolSearchView";
import { useToolSearchController } from "@/lib/search/useToolSearchController";
import type { SearchItem } from "@/lib/search/types";

const ITEMS: SearchItem[] = [
  { id: "a", kind: "conversion", label: "Word to PDF", route: "/word_to_pdf", extensions: [".docx", ".pdf"], mimeTypes: [], synonyms: [], targetId: "pdf" },
  { id: "b", kind: "conversion", label: "Excel to PDF", route: "/excel_to_pdf", extensions: [".xlsx", ".pdf"], mimeTypes: [], synonyms: [], targetId: "pdf" },
  { id: "c", kind: "pdf-tool", label: "Merge", route: "/pdf/merge", extensions: [".pdf"], mimeTypes: [], synonyms: [] },
];

function Harness({ onSelect }: { onSelect: (item: SearchItem) => void }): React.ReactElement {
  const controller = useToolSearchController({ items: ITEMS, onSelect });
  return <ToolSearchView controller={controller} />;
}

function renderHarness(onSelect = vi.fn()) {
  render(<Harness onSelect={onSelect} />);
  return { onSelect, input: screen.getByRole("combobox") };
}

describe("ToolSearch — empty query", () => {
  it("shows no listbox and announces nothing before typing", () => {
    renderHarness();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("ToolSearch — no results", () => {
  it("echoes the query back and offers a way out", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "zzzznope");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText(/Nothing matches/)).toHaveTextContent("zzzznope");
    expect(screen.getByRole("link", { name: /every conversion/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent('No results for "zzzznope".');
  });
});

describe("ToolSearch — single result", () => {
  it("shows exactly one option", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "merge");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent('1 result for "merge".');
  });
});

describe("ToolSearch — keyboard navigation", () => {
  it("ArrowDown/ArrowUp move aria-activedescendant without losing focus", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "pdf");

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(input).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);
    expect(document.activeElement).toBe(input);

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[1]?.id);

    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);
  });

  it("ArrowDown does not run past the last option", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "merge");
    const [only] = screen.getAllByRole("option");

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", only?.id);
  });

  it("Home/End jump to the first/last option", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "pdf");
    const options = screen.getAllByRole("option");

    await user.keyboard("{End}");
    expect(input).toHaveAttribute("aria-activedescendant", options[options.length - 1]?.id);

    await user.keyboard("{Home}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);
  });

  it("Enter selects the active option", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { input } = renderHarness(onSelect);
    await user.type(input, "merge");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "c" }));
  });

  it("Enter with no arrow key press still selects the top result", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { input } = renderHarness(onSelect);
    await user.type(input, "merge");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "c" }));
  });

  it("Escape clears the query and closes the list", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "merge");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });
});

describe("ToolSearch — ARIA wiring", () => {
  it("declares combobox semantics wired to the listbox", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();

    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.type(input, "pdf");
    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input.getAttribute("aria-controls")).toBe(listbox.id);
  });

  it("has a live region announcing the result count", async () => {
    const user = userEvent.setup();
    const { input } = renderHarness();
    await user.type(input, "excel");

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent('1 result for "excel".');
  });
});
