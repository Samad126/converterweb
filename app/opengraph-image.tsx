import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/content/site";

export const alt = `${SITE_NAME} — free online file conversion`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#fafafa",
          color: "#09090b",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 24 }}>
          Convert documents, PDFs, audio and video. No account, nothing kept.
        </div>
      </div>
    ),
    size,
  );
}
