import type { Metadata } from "next";
import Link from "next/link";

import { ConverterShell } from "@/components/ConverterShell";

/**
 * `/tools/psd-to-layers` — a standalone extraction tool, not a catalog page.
 *
 * `.psd` reports `family: null` at `GET /formats`: LibreOffice cannot open it,
 * so this service reads it with its own code and the only target it can ever
 * reach is `layers`. That is a one-off extraction, not a member of the
 * `{source}_to_{target}` conversion matrix `lib/catalog.ts` builds pages for —
 * see the note there — so this reuses `ConverterShell` directly, locked to
 * `layers` and narrowed to `.psd`, rather than gaining a 37th catalog page.
 *
 * Reachability is still read live from `GET /formats`, exactly as every other
 * page does: if the service ever stops offering `layers` from `.psd`, the
 * button disables itself with the server's own reason instead of this page
 * quietly lying about what it can do.
 */
export const metadata: Metadata = {
  title: "PSD to Layers — Free Online PSD Layer Extractor",
  description:
    "Pull every layer out of a Photoshop PSD as a separate PNG, with a manifest describing each one. Free, no sign-up, no file left on the server.",
  alternates: { canonical: "/tools/psd-to-layers" },
};

export default function PsdToLayersPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-10 sm:py-14">
      <h1 className="page-title">PSD to layers</h1>
      <p className="page-lede">
        Upload a Photoshop PSD and get back a ZIP holding one PNG per layer, at the path its group
        gives it, plus a manifest describing every layer — including any that produced no image of
        its own and why.
      </p>

      <div className="mt-8">
        <ConverterShell lockedTargetId="layers" acceptedExtensions={[".psd"]} />
      </div>

      <hr className="hairline my-10" />

      <section className="flex flex-col gap-4">
        <h2 className="section-title">What to expect</h2>
        <ul className="fact-list">
          <li>Files accepted: .psd — up to 25 MB.</li>
          <li>
            LibreOffice cannot open a PSD, so this is handled entirely by this service&rsquo;s own
            code rather than the export filter every other tool on this site uses.
          </li>
          <li>
            An empty group, an adjustment layer, or anything else with nothing to rasterise is
            still named in the manifest, along with why it has no file, rather than silently
            missing from the archive.
          </li>
        </ul>
      </section>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="section-title">Questions</h2>
        <dl className="fact-list">
          <div>
            <dt className="font-semibold">Is it free? Do I need an account?</dt>
            <dd>Free, with no account, no email and no sign-up.</dd>
          </div>
          <div>
            <dt className="font-semibold">What happens to my file?</dt>
            <dd>
              It is converted in a temporary workspace that is deleted before the response is sent
              back — on success, on failure, on timeout, and if you close the page mid-conversion.
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-10">
        Looking for a full document conversion instead? <Link href="/">Browse every conversion</Link>{" "}
        or see the <Link href="/pdf">PDF tools</Link>.
      </p>
    </main>
  );
}
