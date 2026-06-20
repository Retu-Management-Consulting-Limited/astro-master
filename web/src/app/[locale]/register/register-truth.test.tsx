// @vitest-environment jsdom
// P0-1 guard: /register must never claim "你的盘已经准备好了" when there is no
// chart (constitution §8 真vs编 / WORKFLOW R4). A chart-less visitor is steered
// to build a chart first instead of being offered to "留住" a non-existent one.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";

vi.hoisted(() => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
      key: (i: number) => Array.from(mem.keys())[i] ?? null,
      get length() { return mem.size; },
    },
  });
});

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

import RegisterPage from "./page";
import { useFunnel } from "@/lib/store";
import { computeChart, type BirthInput } from "@/lib/astro/chart";

const BIRTH: BirthInput = { year: 1990, month: 5, day: 15, hour: 8, minute: 30, lat: 39.9075, lng: 116.3972, tz: 8 };

function renderPage() {
  return render(
    <NextIntlClientProvider locale="zh" messages={loadMessages("zh")}>
      <RegisterPage />
    </NextIntlClientProvider>,
  );
}

describe("RegisterPage · 真vs编 (P0-1)", () => {
  beforeEach(() => { act(() => { useFunnel.setState({ chart: undefined, birth: undefined }); }); push.mockClear(); });
  afterEach(cleanup);

  it("NO chart → never claims the chart is ready, and offers a chart-first CTA", () => {
    renderPage();
    expect(screen.queryByText(/已经准备好了/)).toBeNull();
    const cta = screen.getByTestId("go-input");
    expect(cta).toBeTruthy();
    act(() => { cta.click(); });
    expect(push).toHaveBeenCalledWith("/input");
  });

  it("WITH chart → shows the ready badge + the real sign-up form", () => {
    act(() => { useFunnel.setState({ birth: BIRTH, chart: computeChart(BIRTH) }); });
    renderPage();
    expect(screen.getByTestId("ready-badge").textContent).toMatch(/准备好/);
    expect(screen.getByTestId("account-submit")).toBeTruthy();
    expect(screen.queryByTestId("go-input")).toBeNull();
  });
});
