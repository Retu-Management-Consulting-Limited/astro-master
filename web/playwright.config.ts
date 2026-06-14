import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  // One shared dev server (AI-on, single process) → run serially to avoid
  // request contention that flakes timing-sensitive funnel/AI walks.
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: "/Users/ddd/.bun/bin/bun run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
