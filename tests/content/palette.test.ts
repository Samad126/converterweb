/**
 * The palette guard.
 *
 * This replaces `achromatic.test.ts`, which enforced the rule that there was no
 * hue anywhere in the app. That rule has been lifted — the product has a real
 * palette now — so the thing worth enforcing changed with it. What is checked
 * here is the property that actually keeps a design system coherent: **every
 * colour in the stylesheet comes from the approved palette.**
 *
 * The failure this catches is not "someone added a colour". It is "someone
 * added a colour *this time*" — a one-off blue picked to fix one screen, which
 * is how a system quietly becomes a pile of local decisions. Compiling the
 * sheet through the real Tailwind pipeline means that includes anything a
 * utility class would have dragged in.
 *
 * The palette being guarded is Monochrome & Slate: deep blacks, crisp whites
 * and neutral greys only — no hue anywhere, including the accent. If a colour
 * is added to `globals.css` it has to be added here too, on purpose, in a
 * commit that says why.
 */
import { readFileSync } from "node:fs";

import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { beforeAll, describe, expect, it } from "vitest";

const STYLESHEET = "app/globals.css";

/**
 * Every colour the design is allowed to use, lowercase.
 *
 * Two sources, and both are deliberate. The first block is the approved
 * palette, role by role. The second is the neutral ramp the palette needs in
 * order to have steps at all — a single border grey cannot outline a dropdown
 * over a card, and a single text grey cannot be both muted prose and a
 * placeholder.
 */
const PALETTE = new Set([
  // --- light mode -----------------------------------------------------------
  "#fafafa", // background / canvas
  "#ffffff", // surface: cards, panels, fields; text on a filled control
  "#09090b", // text primary; also the dark block (hero, footer, spotlight)
  "#71717a", // text secondary
  "#e5e7eb", // border / divider
  "#18181b", // primary accent — "this one is an action"; also dark-mode surface
  "#27272a", // primary hover; also border / divider

  // --- dark mode ------------------------------------------------------------
  "#e4e4e7", // primary accent — dark; also success
  "#f4f4f5", // primary hover — dark
  "#a1a1aa", // secondary accent — dark; also text secondary

  // --- secondary accent -----------------------------------------------------
  "#334155", // charcoal slate — light (format badges, secondary marks)

  // --- status ---------------------------------------------------------------
  // Success is the accent, deliberately: on this palette a completed conversion
  // is the same cobalt as the button that started it, so green never appears.
  "#d97706", // warning
  "#dc2626", // danger

  /*
   * The neutral ramp, which the palette needs in order to have steps at all — a
   * single border grey cannot outline a dropdown over a card, and a single text
   * grey cannot be both muted prose and a placeholder.
   */
  "#d4d4d8", // structural rules, light (band / divide)
  "#3f3f46", // structural rules, dark
  "#52525b", // decorative marks, dark; the dashed dropzone edge

  /*
   * True black. Every shadow uses it — a shadow is not a surface colour, it is
   * the absence of light, and on a dark canvas a tinted shadow reads as a
   * smudge rather than a shadow. It also arrives unbidden: Tailwind emits
   * `#0000` for a transparent shadow reset, which expands to this.
   *
   * It is also the dark-mode hero background, deliberately — the one block
   * allowed to go past `--surface-strong` (#18181b) to full black, since the
   * page canvas is already #09090b and a "raised" panel one step lighter than
   * that reads as barely different.
   */
  "#000000",
]);

let compiled = "";
let source = "";

beforeAll(async () => {
  source = readFileSync(STYLESHEET, "utf8");
  const result = await postcss([tailwind()]).process(source, { from: STYLESHEET });
  compiled = result.css;
}, 60_000);

/**
 * `#abc`, `#abcd`, `#aabbcc`, `#aabbccdd` → lowercase `#aabbcc`.
 *
 * The alpha forms matter and are not a technicality: Tailwind writes a
 * transparent shadow reset as `#0000`, and treating that as its own colour
 * rather than as transparent black would fail this guard on the framework's
 * output rather than on anything the design did.
 */
function expand(hex: string): string {
  const digits = hex.slice(1).toLowerCase();
  if (digits.length === 3 || digits.length === 4) {
    return `#${[...digits.slice(0, 3)].map((d) => d + d).join("")}`;
  }
  if (digits.length === 6 || digits.length === 8) {
    return `#${digits.slice(0, 6)}`;
  }
  return hex.toLowerCase();
}

/** Every hex literal in a stylesheet's declaration values. */
function hexes(css: string): string[] {
  const found: string[] = [];
  postcss.parse(css).walkDecls((declaration) => {
    for (const match of declaration.value.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
      const digits = match[1] ?? "";
      if (![3, 4, 6, 8].includes(digits.length)) continue;
      found.push(expand(`#${digits}`));
    }
  });
  return found;
}

/** The `r g b` triple of every `rgb()`/`rgba()` use, as a hex string. */
function rgbTriples(css: string): Array<{ found: string; hex: string }> {
  const found: Array<{ found: string; hex: string }> = [];
  postcss.parse(css).walkDecls((declaration) => {
    for (const match of declaration.value.matchAll(/\brgba?\(([^()]*)\)/gi)) {
      const [channels] = (match[1] ?? "").split("/");
      const parts = (channels ?? "").trim().split(/[\s,]+/).filter(Boolean);
      if (parts.length < 3) continue;
      const hex =
        "#" +
        parts
          .slice(0, 3)
          .map((part) =>
            Math.round(Number.parseFloat(part))
              .toString(16)
              .padStart(2, "0"),
          )
          .join("");
      found.push({ found: match[0], hex });
    }
  });
  return found;
}

describe("the compiled stylesheet", () => {
  it("compiles, and compiled something", () => {
    expect(compiled.length).toBeGreaterThan(1000);
    expect(compiled).toContain("--accent");
  });

  it("uses only colours from the approved palette", () => {
    const stray = [...new Set(hexes(compiled))].filter((hex) => !PALETTE.has(hex));
    expect(stray, "a colour outside the palette reached the compiled stylesheet").toEqual([]);
  });

  it("uses only palette colours in its rgb() shadows", () => {
    const stray = rgbTriples(compiled)
      .filter(({ hex }) => !PALETTE.has(hex))
      .map(({ found }) => found);
    expect(stray).toEqual([]);
  });

  it("has actually read some colours, so the checks above are not vacuous", () => {
    // Guards against the palette passing because nothing matched at all.
    expect(hexes(compiled).length).toBeGreaterThan(10);
    expect(hexes(compiled)).toContain("#18181b");
  });

  it("keeps Tailwind's own palette out of the build", () => {
    // `@theme { --color-*: initial }` is the line that does this. With it, the
    // utility `bg-red-500` is not a class that exists — so a component cannot
    // reach around the tokens by typing one.
    expect(compiled).not.toContain("--color-red-500");
    expect(compiled).not.toContain("--color-blue-500");
    expect(compiled).not.toContain("oklch(0.637 0.237 25.331)");
  });
});

describe("the stylesheet source", () => {
  it("uses only palette colours in its own declarations", () => {
    expect([...new Set(hexes(source))].filter((hex) => !PALETTE.has(hex))).toEqual([]);
  });

  it("declares each role at the value the palette specifies", () => {
    const declared = (name: string): string | null =>
      source.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))?.[1]?.toLowerCase() ??
      null;

    // Light theme. Only the roles with a fixed literal; the rest are aliases.
    expect(declared("--paper")).toBe("#fafafa");
    expect(declared("--ink")).toBe("#09090b");
    expect(declared("--accent")).toBe("#18181b");
    expect(declared("--accent-hover")).toBe("#27272a");
    expect(declared("--accent-2")).toBe("#334155");
    expect(declared("--warning")).toBe("#d97706");
    expect(declared("--danger")).toBe("#dc2626");
  });

  it("gives every functional colour a state to describe", () => {
    // A status colour declared but never used is a palette entry someone added
    // and then forgot to wire up — which is how a "success green" ends up
    // documented but absent from the product.
    for (const token of ["--success", "--warning", "--danger", "--accent-2"]) {
      expect(source, `${token} is declared but never used`).toContain(`var(${token})`);
    }
  });

  it("keeps the dark theme's own values, rather than reusing the light ones", () => {
    /*
     * Dark mode is a chosen set of values, not an inversion of the light block,
     * and the two accents in particular have to lift on a dark canvas — the
     * light theme's hover direction (darker) would read as disabled there.
     *
     * Every hex below is checked against the palette set above too; this is the
     * narrower assertion that they are declared at all.
     */
    const dark = source.slice(source.indexOf("prefers-color-scheme: dark"));
    for (const value of ["#09090b", "#18181b", "#27272a", "#a1a1aa", "#e4e4e7", "#f4f4f5"]) {
      expect(dark, `${value} is missing from the dark block`).toContain(value);
    }
  });
});
