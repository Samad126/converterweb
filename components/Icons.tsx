/**
 * Inline SVG, 1.5 px strokes, `currentColor`.
 *
 * No icon font and no sprite sheet: an icon font is a network request and a
 * licence, and the four glyphs this app needs fit in one file. Every icon is
 * `aria-hidden`, because each one sits beside the word it stands for — there is
 * no icon in this app that is the only carrier of a meaning.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** A document with a folded corner. The drop zone's affordance. */
export function FileIcon(props: IconProps): React.ReactElement {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Icon>
  );
}

/** The success mark, and the selected mark on a format chip. */
export function CheckIcon(props: IconProps): React.ReactElement {
  return (
    <Icon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

/** Copy-to-clipboard, for the request id. */
export function CopyIcon(props: IconProps): React.ReactElement {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}

/** Download, for the result. */
export function DownloadIcon(props: IconProps): React.ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </Icon>
  );
}

/** A clock face, for the notice that the service is not answering. */
export function ClockIcon(props: IconProps): React.ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

/** An eye, for the text preview. */
export function EyeIcon(props: IconProps): React.ReactElement {
  return (
    <Icon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}
