import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EditTool } from "@/components/pdf/EditTool";

export const metadata: Metadata = {
  title: "Edit a PDF — Free Online PDF Tool",
  description: "Draw text, images, shapes and freehand strokes onto a PDF's pages, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/edit" },
};

export default function EditPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Edit a PDF", "/pdf/edit"],
        ]}
      />

      <h1 className="page-title">Edit a PDF</h1>
      <p className="page-lede">
        Draw free text, an image, a rectangle, an ellipse, a line or a freehand stroke onto exact
        page positions. Baked permanently into the page — a visual mark, not an editable layer.
      </p>
      <div className="conversion-aside-inner mt-8">
        <EditTool />
      </div>
    </main>
  );
}
