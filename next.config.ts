import type { NextConfig } from "next";

/**
 * Deliberately empty of rewrites and route handlers.
 *
 * The browser talks to the converter directly — see the note at the top of
 * `lib/api/api.ts`. A Next route handler in front of the API would add its own
 * timeout to a budget that is already 120 s, and would hold a second copy of a
 * 25 MiB upload in memory while streaming it through.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next build` emits a self-contained server in `.next/standalone`: Next
  // traces the modules this app actually imports and copies only those, so the
  // image carries a few hundred kilobytes of node_modules instead of the ~500
  // MiB `npm ci` installed. The Dockerfile copies that directory and runs
  // `node server.js` from it. `npm run dev` and `npm start` are unaffected.
  output: "standalone",
  // Next will otherwise write its own AGENTS.md and CLAUDE.md into the project
  // root on every dev run. This repository documents itself in README.md, and
  // two generated files that say the same thing in less detail are noise.
  agentRules: false,
  // The page loads nothing from anywhere else (see `app/layout.tsx`), so the
  // policy can say so. `'unsafe-inline'` is for Next's own bootstrap scripts and
  // the JSON-LD block; a nonce would remove it but forces dynamic rendering.
  // `connect-src` allows the converter origin when it is not same-origin.
  async headers() {
    const api = (process.env.NEXT_PUBLIC_CONVERTER_BASE_URL ?? "").trim();
    const report = (process.env.NEXT_PUBLIC_ERROR_REPORT_URL ?? "").trim();
    const connect = ["'self'", api, report].filter(Boolean).join(" ");
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      `connect-src ${connect}`,
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
