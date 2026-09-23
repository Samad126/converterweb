/**
 * A format monogram, and the pair of them that reads as a conversion.
 *
 * iLovePDF marks each of its tools with a coloured app icon — a red W for Word,
 * a green X for Excel. This design has no colours to spend, so the same job is
 * done with the two things it does have: the letterform, and inversion.
 *
 * A `<FormatPair>` is therefore an outline tile for the source and a solid black
 * one for the target, joined by an arrow. The filled tile is the answer to
 * "which way does this go", which is the one thing a grid of dozens of cards
 * makes genuinely hard to see — and it is the same trick the rest of the app
 * uses to mark emphasis (`.panel-strong`, `.chip-inverse`).
 */
export interface FormatBadgeProps {
  /** The monogram: "W", "PDF", "HTML". */
  label: string;
  /** True for the target of a conversion: drawn solid rather than outlined. */
  filled?: boolean;
  size?: "sm" | "md";
}

export function FormatBadge({
  label,
  filled = false,
  size = "md",
}: FormatBadgeProps): React.ReactElement {
  return (
    <span
      className="badge"
      data-filled={filled}
      data-size={size}
      /*
       * Long monograms ("HTML", "DOCX") need a smaller face than short ones
       * ("W", "X") to stay inside the same square. Doing it here rather than in
       * CSS keeps the tile size fixed, so a grid of mixed formats still lines
       * up on a baseline.
       */
      data-long={label.length > 2}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export interface FormatPairProps {
  source: string;
  target: string;
  size?: "sm" | "md";
}

/** `W → PDF`. The card's icon, and the page's. */
export function FormatPair({ source, target, size = "md" }: FormatPairProps): React.ReactElement {
  return (
    <span className="badge-pair">
      <FormatBadge label={source} size={size} />
      <ArrowIcon />
      <FormatBadge label={target} filled size={size} />
    </span>
  );
}

/**
 * The arrow between the two tiles.
 *
 * Inline rather than from `Icons.tsx`, which draws 24×24 stroke icons at a
 * stroke width chosen for that grid; this one sits in a much smaller box and
 * would look heavy at the same settings.
 */
function ArrowIcon(): React.ReactElement {
  return (
    <svg
      className="badge-arrow"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 7h9" />
      <path d="m8 4 3 3-3 3" />
    </svg>
  );
}
