// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";

// jsdom here has no localStorage (node started without --localstorage-file) but
// zustand/persist captures window.localStorage when the store module is imported.
// vi.hoisted runs BEFORE the hoisted ES imports, so the shim is in place first.
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

// next-intl's navigation shim isn't wired in jsdom — stub the router the page
// pushes through. The page + useChartGuard now import useRouter from
// @/i18n/navigation, so mock that module.
const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

import CalibrationPage from "./page";
import { useFunnel } from "@/lib/store";
import { computeChart, type BirthInput } from "@/lib/astro/chart";

const BIRTH: BirthInput = { year: 1990, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const CHART = computeChart(BIRTH);

// Drive the page past the chart guard + LoadingRitual into the questions.
function seedStoreAndOpen() {
  act(() => {
    useFunnel.setState({
      birth: BIRTH,
      birthForm: { date: "1990-06-13", time: "08:40", knownTime: true, country: "AU", city: "Melbourne" },
      chart: CHART,
      hasHydrated: true,
      authChecked: true,
      timeBelief: undefined,
      ascCandidate: undefined,
    });
  });
  render(
    <NextIntlClientProvider locale="zh" messages={loadMessages("zh")}>
      <CalibrationPage />
    </NextIntlClientProvider>,
  );
  // LoadingRitual fires onDone after 1300ms.
  act(() => { vi.advanceTimersByTime(1400); });
}

function answerTrait() {
  const opt = screen.getAllByTestId("cal-opt")[0];
  fireEvent.click(opt);
  act(() => { vi.advanceTimersByTime(320); }); // the 280ms reveal delay
}

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
  useFunnel.setState({ timeBelief: undefined, ascCandidate: undefined });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CalibrationPage · 特质 + 人生大事 → TimeBelief lands in store", () => {
  it("answering 2 trait Qs + selecting life events seeds a NON-UNIFORM belief (confidence>0) and routes to /reading", () => {
    seedStoreAndOpen();

    // two self-trait questions (back-compat ASC opener)
    answerTrait();
    answerTrait();

    // now on the 人生大事 step — pick three events, drag one age, then finish
    const chips = screen.getAllByTestId("cal-event");
    expect(chips.length).toBe(5);
    fireEvent.click(chips[0]); // move
    fireEvent.click(chips[1]); // career
    fireEvent.click(chips[2]); // relationship

    const ages = screen.getAllByTestId("cal-event-age");
    expect(ages.length).toBe(3); // a slider appears per selected event
    fireEvent.change(ages[0], { target: { value: "24" } });

    fireEvent.click(screen.getByTestId("cal-finish"));

    const s = useFunnel.getState();
    expect(s.timeBelief, "TimeBelief must be seeded into the store").toBeTruthy();
    expect(s.timeBelief!.confidence, "events → confidence > 0").toBeGreaterThan(0);
    // non-uniform buckets: the belief actually moved off the flat prior
    const flat = 1 / s.timeBelief!.buckets.length;
    expect(s.timeBelief!.buckets.some((b) => Math.abs(b - flat) > 1e-6), "buckets must be non-uniform").toBe(true);
    // back-compat ASC label still produced for the reading page
    expect(typeof s.ascCandidate).toBe("string");
    expect(push).toHaveBeenCalledWith("/reading");
  });

  it("the events question copy names the rectification mechanism (真 via 对天象, not fortune-telling)", () => {
    seedStoreAndOpen();
    answerTrait();
    answerTrait();
    expect(screen.getByText(/反推你的出生时刻/)).toBeTruthy();
    expect(screen.getByText(/不是算命/)).toBeTruthy();
  });

  it("skipping the events step still completes the funnel with a flat belief (no events ⇒ no claim)", () => {
    seedStoreAndOpen();
    answerTrait();
    answerTrait();
    // select nothing → finish button is the skip path
    fireEvent.click(screen.getByTestId("cal-finish"));

    const s = useFunnel.getState();
    expect(s.timeBelief).toBeTruthy();
    expect(s.timeBelief!.confidence).toBe(0); // honest: nothing known about the hour
    expect(push).toHaveBeenCalledWith("/reading");
  });
});
