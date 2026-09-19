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
  // Next will otherwise write its own AGENTS.md and CLAUDE.md into the project
  // root on every dev run. This repository documents itself in README.md, and
  // two generated files that say the same thing in less detail are noise.
  agentRules: false,
};

export default nextConfig;
