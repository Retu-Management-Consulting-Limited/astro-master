// @vitest-environment jsdom
// P1-4 guard: a user who hit the crisis short-circuit this session must not be
// shown the A2HS / install growth nudge (constitution §9: vulnerable users first).
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

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/chat" }));
vi.mock("@/lib/pwa/a2hs", () => ({ detectA2HS: () => "ios-safari" }));

import { InstallPrompt } from "./InstallPrompt";
import { useUIStore } from "@/lib/ui-store";

function renderPrompt() {
  return render(
    <NextIntlClientProvider locale="zh" messages={loadMessages("zh")}>
      <InstallPrompt />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  localStorage.clear();
  act(() => { useUIStore.setState({ crisisActive: false }); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("InstallPrompt · crisis suppression (P1-4)", () => {
  it("shows on an engage page in the normal (non-crisis) case", () => {
    renderPrompt();
    act(() => { vi.advanceTimersByTime(2700); });
    expect(screen.queryByTestId("install-prompt")).toBeTruthy();
  });

  it("stays hidden when a crisis fired this session", () => {
    act(() => { useUIStore.setState({ crisisActive: true }); });
    renderPrompt();
    act(() => { vi.advanceTimersByTime(2700); });
    expect(screen.queryByTestId("install-prompt")).toBeNull();
  });
});
