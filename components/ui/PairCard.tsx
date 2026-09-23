import Link from "next/link";

import { FormatPair } from "@/components/ui/FormatBadge";

/** A conversion card built from plain labels, for the catalogs that are not `ConversionEntry`s. */
export function PairCard({
  href,
  source,
  target,
  heading,
  blurb,
}: {
  href: string;
  source: string;
  target: string;
  heading: string;
  blurb: string;
}): React.ReactElement {
  return (
    <Link className="tool-card" href={href} prefetch={false}>
      <FormatPair source={source} target={target} />
      <span className="tool-card-title">{heading}</span>
      <span className="tool-card-blurb">{blurb}</span>
    </Link>
  );
}
