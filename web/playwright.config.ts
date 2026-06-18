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
    // RU_PUBLIC 开关：生产默认关（俄语不对用户暴露），但 e2e 必须能测 /ru，
    // 故在测试用 dev server 显式开。proxy 据此放行 /ru 前缀；关时会重定向走。
    env: { NEXT_PUBLIC_RU_PUBLIC: "1" },
  },
});
