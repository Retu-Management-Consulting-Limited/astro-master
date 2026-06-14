import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` is provided by the Next.js runtime; stub it for vitest.
      "server-only": path.resolve(__dirname, "src/test/server-only.stub.ts"),
    },
  },
});
