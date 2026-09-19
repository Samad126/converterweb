import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The same `@/` alias tsconfig declares, so the tests import the app the
    // way the app imports itself.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    env: {
      // A distinct origin, so a test can tell an API call apart from anything
      // jsdom might fetch for itself.
      NEXT_PUBLIC_CONVERTER_BASE_URL: "http://converter.test",
    },
  },
});
