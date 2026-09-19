import type { NextConfig } from "next";

/**
 * Deliberately empty of rewrites and route handlers.
 *
 * The browser talks to the converter directly — see the note at the top of
 * `lib/api.ts`. A Next route handler in front of the API would add its own
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
};

export default nextConfig;
