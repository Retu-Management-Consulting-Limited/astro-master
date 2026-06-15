import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Rate limiting is OFF by default in unit tests so route tests can call an
    // endpoint repeatedly under one identity. Tests that specifically exercise
    // rate limiting flip RL_DISABLED="0" locally (see ratelimit / chat / reading).
    env: { RL_DISABLED: "1" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` is provided by the Next.js runtime; stub it for vitest.
      "server-only": path.resolve(__dirname, "src/test/server-only.stub.ts"),
    },
  },
});
