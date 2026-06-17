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
    server: {
      deps: {
        // next-intl's pre-compiled ESM imports the bare `next/server` specifier.
        // Next 16 ships no `exports` map, so Node can't resolve it when the dep
        // is externalized. Inline it so vitest's alias (next/server → .js) applies.
        inline: ["next-intl"],
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      // `server-only` is provided by the Next.js runtime; stub it for vitest.
      {
        find: "server-only",
        replacement: path.resolve(__dirname, "src/test/server-only.stub.ts"),
      },
      // Next 16 ships no `exports` map, so the bare `next/server` specifier
      // (used by next-intl's pre-compiled ESM) has no extension for vitest to
      // resolve. Point it at the real file. First-party tests already resolved
      // it via vitest's extension fallback; this just makes deps agree.
      {
        find: /^next\/server$/,
        replacement: path.resolve(__dirname, "node_modules/next/server.js"),
      },
    ],
  },
});
