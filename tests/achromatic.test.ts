/**
 * The black-and-white rule, enforced by a compiler rather than by review.
 *
 * This compiles `app/globals.css` through the real Tailwind pipeline — the same
 * one `next build` runs — and then reads every colour out of the result. A hue
 * anywhere in the output fails, whether it came from a component class, a
 * utility, a token, a shadow, or a default that Tailwind would otherwise have
 * emitted for a palette nobody asked for.
 *
 * That last case is why this test is worth its runtime: Tailwind v4 ships a
 * full chromatic palette, and `@theme { --color-*: initial }` is what removes
 * it. Delete that line and this test fails on the oklch values that come back.
 */
import { readFileSync } from "node:fs";

import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import colorNames from "color-name";
import { beforeAll, describe, expect, it } from "vitest";

const STYLESHEET = "app/globals.css";

let compiled = "";

beforeAll(async () => {
  const source = readFileSync(STYLESHEET, "utf8");
  const result = await postcss([tailwind()]).process(source, { from: STYLESHEET });
  compiled = result.css;
}, 60_000);

interface Rgba {
  r: number;
  g: number;
  b: number;
}

const isAchromatic = ({ r, g, b }: Rgba): boolean => r === g && g === b;

/** `#abc`, `#aabbcc`, `#aabbccdd`. */
function fromHex(hex: string): Rgba {
  const digits = hex.length <= 4 ? [...hex].map((d) => d + d).join("") : hex;
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  };
}

/** Component channels, which may be numbers, percentages, or `none`. */
function channel(value: string, max: number): number {
  const trimmed = value.trim();
  if (trimmed === "none") return 0;
  if (trimmed.endsWith("%")) return (Number.parseFloat(trimmed) / 100) * max;
  return Number.parseFloat(trimmed);
}

function color(method: string, inside: string): Rgba {
  // Drop any `/ alpha`, which is not a colour channel.
  const [channels] = inside.split("/");
  const parts = (channels ?? "").trim().split(/[\s,]+/).filter(Boolean);
  const [first = "0", second = "0", third = "0"] = parts;

  switch (method.toLowerCase()) {
    case "rgb":
    case "rgba":
      return {
        r: channel(first, 255),
        g: channel(second, 255),
        b: channel(third, 255),
      };
    case "hsl":
    case "hsla": {
      // Hue is meaningless without saturation, so a fully desaturated hsl() is
      // a grey whatever its hue says.
      const saturation = channel(second, 100);
      const lightness = channel(third, 100);
      const level = Math.round((lightness / 100) * 255);
      return saturation === 0
        ? { r: level, g: level, b: level }
        : // Saturated: report it as chromatic by construction.
          { r: 0, g: 1, b: 2 };
    }
    case "oklch":
    case "lch": {
      // Third component is chroma: 0 is a grey.
      const chroma = channel(third, 0.4);
      return chroma === 0 ? { r: 0, g: 0, b: 0 } : { r: 0, g: 1, b: 2 };
    }
    case "oklab":
    case "lab": {
      // Two opponent axes; a and b both zero is a grey.
      const a = channel(second, 0.4);
      const b = channel(third, 0.4);
      return a === 0 && b === 0 ? { r: 0, g: 0, b: 0 } : { r: 0, g: 1, b: 2 };
    }
    default:
      // An unparsed colour function is treated as chromatic, so a new syntax
      // fails loudly instead of slipping through.
      return { r: 0, g: 1, b: 2 };
  }
}

/**
 * The parts of a stylesheet that can actually paint something: declaration
 * values, and nothing else.
 *
 * Reading the file as text would fail on two things that are not colours. One
 * is prose — this project's comments discuss colour constantly, and "no red, no
 * green" is a sentence. The other is Tailwind's own browser-capability query,
 * `@supports (... (not (color: rgb(from red r g b))))`, which probes for
 * relative colour syntax with a value no browser ever paints. At-rule
 * conditions are not declarations, so neither is read.
 */
function declarationValues(css: string): string {
  const values: string[] = [];
  postcss.parse(css).walkDecls((declaration) => {
    values.push(declaration.value);
  });
  return values.join("\n");
}

/** Every colour literal in a set of declaration values, with where it was found. */
function findColors(css: string): Array<{ found: string; rgba: Rgba }> {
  const results: Array<{ found: string; rgba: Rgba }> = [];

  for (const match of css.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
    const digits = match[1] ?? "";
    if (![3, 4, 6, 8].includes(digits.length)) continue;
    results.push({ found: match[0], rgba: fromHex(digits) });
  }

  for (const match of css.matchAll(/\b(rgba?|hsla?|oklch|oklab|lch|lab)\(([^()]*)\)/gi)) {
    results.push({
      found: match[0],
      rgba: color(match[1] ?? "", match[2] ?? ""),
    });
  }

  // Named colours, matched as whole identifiers and looked up in the CSS
  // keyword table — so `gray` passes and `red` does not, without a list of
  // guesses here.
  for (const match of css.matchAll(/[a-z]{3,24}/gi)) {
    const name = match[0].toLowerCase();
    const rgb = (colorNames as Record<string, [number, number, number]>)[name];
    if (!rgb) continue;
    results.push({
      found: name,
      rgba: { r: rgb[0], g: rgb[1], b: rgb[2] },
    });
  }

  return results;
}

describe("the compiled stylesheet", () => {
  it("compiles, and compiled something", () => {
    expect(compiled.length).toBeGreaterThan(1000);
    // A sanity check that this is the app's sheet and not an empty result.
    expect(compiled).toContain("--ink");
  });

  it("contains no chromatic colour", () => {
    const chromatic = findColors(declarationValues(compiled)).filter(
      ({ rgba }) => !isAchromatic(rgba),
    );

    expect(
      chromatic.map((entry) => entry.found),
      "a colour with a hue reached the compiled stylesheet",
    ).toEqual([]);
  });

  it("has actually read some colours, so the check above is not vacuous", () => {
    const colors = findColors(declarationValues(compiled));
    expect(colors.length).toBeGreaterThan(20);
    expect(colors.some((entry) => entry.found.includes("#"))).toBe(true);
  });

  it("keeps Tailwind's own palette out of the build", () => {
    // `@theme { --color-*: initial }` is the line that does this. With it, the
    // utility `bg-red-500` is not a class that exists.
    expect(compiled).not.toContain("--color-red-500");
    expect(compiled).not.toContain("--color-blue-500");
    expect(compiled).not.toContain("oklch(0.637 0.237 25.331)");
  });
});

describe("the stylesheet source", () => {
  it("declares only achromatic tokens", () => {
    const source = readFileSync(STYLESHEET, "utf8");
    const chromatic = findColors(declarationValues(source)).filter(
      ({ rgba }) => !isAchromatic(rgba),
    );
    expect(chromatic.map((entry) => entry.found)).toEqual([]);
  });

  it("declares no gradient with a hue and no coloured shadow", () => {
    const source = readFileSync(STYLESHEET, "utf8");

    for (const match of source.matchAll(/linear-gradient\([^)]*\)/gi)) {
      expect(findColors(match[0]).every(({ rgba }) => isAchromatic(rgba))).toBe(true);
    }
    for (const match of source.matchAll(/box-shadow:\s*([^;}]+)/gi)) {
      expect(findColors(match[1] ?? "").every(({ rgba }) => isAchromatic(rgba))).toBe(true);
    }
  });
});
