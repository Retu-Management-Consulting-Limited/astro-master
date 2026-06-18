// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { TimeDetective, bandCovers, lockState } from "./TimeDetective";
import { seed } from "@/lib/astro/timeBelief";
import { detectiveBandCopy } from "@/lib/reading/calibrationSignal";
import type { LifeEvent } from "@/lib/astro/rectify";
import type { TimeBelief } from "@/lib/astro/timeBelief";

afterEach(cleanup);

// TimeDetective 文案走 next-intl（namespace components.timeDetective）；render 需
// provider 注入 messages。默认 locale zh，故既有中文断言（"还很宽"）原样保留。
const ZH = loadMessages("zh");
function renderTD(belief: TimeBelief): RenderResult {
  return render(
    <NextIntlClientProvider locale="zh" messages={ZH}>
      <TimeDetective belief={belief} />
    </NextIntlClientProvider>,
  );
}

// The localized lock label, derived from the pure lockState — mirrors the
// component, so the wide-vs-narrow not.toBe assertion stays a real distinction.
function lockLabel(belief: TimeBelief): string {
  const { wide, hours } = lockState(belief);
  const m = (ZH.components as { timeDetective: { lockWide: string; lockNarrow: string } }).timeDetective;
  return wide ? m.lockWide : m.lockNarrow.replace("{hours}", String(hours));
}

const birth = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const e1: LifeEvent = { kind: "move", year: 2019, month: 3 };
const e2: LifeEvent = { kind: "career", year: 2021, month: 9 };
const e3: LifeEvent = { kind: "relationship", year: 2023, month: 6 };

// A hand-built belief at an exact topRange, so the highlight assertion is precise
// and independent of the rectifier's chosen peak.
function beliefAt(topRange: [number, number], confidence: number): TimeBelief {
  return { buckets: new Array(24).fill(1 / 24), topRange, confidence, mode: confidence >= 0.5 ? "house" : "planet" };
}

function litHours(): number[] {
  return screen
    .getAllByTestId("td-hour")
    .filter((el) => el.getAttribute("data-on") === "1")
    .map((el) => Number(el.getAttribute("data-hour")))
    .sort((a, b) => a - b);
}

describe("bandCovers · wrap-aware highlight math", () => {
  it("topRange=[9,11] covers exactly 9,10,11", () => {
    const lit = [...Array(24).keys()].filter((h) => bandCovers(9, 11, h));
    expect(lit).toEqual([9, 10, 11]);
  });
  it("a midnight-crossing band [21,2] covers 21,22,23,0,1,2 and nothing else", () => {
    const lit = [...Array(24).keys()].filter((h) => bandCovers(21, 2, h));
    expect(lit).toEqual([0, 1, 2, 21, 22, 23]);
  });
});

describe("TimeDetective · highlight covers the belief topRange", () => {
  it("topRange=[9,11] lights up exactly hours 9,10,11 in the 24h bar", () => {
    renderTD(beliefAt([9, 11], 0.55));
    expect(litHours()).toEqual([9, 10, 11]);
  });

  it("a midnight-crossing topRange=[22,2] lights up 22,23,0,1,2 (wrap-aware render)", () => {
    renderTD(beliefAt([22, 2], 0.55));
    expect(litHours()).toEqual([0, 1, 2, 22, 23]);
  });
});

describe("TimeDetective · 动态内容契约 — wide vs narrow render DIFFERENTLY (not.toBe)", () => {
  // strong form (CLAUDE.md R14/R15): the PRESENTATION must move with the belief,
  // not merely the underlying field. Assert the rendered lock label, the copy line,
  // and the SET of lit hours all differ between a wide and a narrowed belief.
  const wide = seed(birth, []); // nothing known → whole-clock band, planet mode
  const narrow = seed(birth, [e1, e2, e3]); // corroborated → tightened band

  it("the lock readout differs (wide 'still wide' vs narrow 'locked to X hours')", () => {
    expect(lockLabel(narrow)).not.toBe(lockLabel(wide));
  });

  it("the spoken copy line differs (it is detectiveBandCopy, charter-clean)", () => {
    expect(detectiveBandCopy(narrow)).not.toBe(detectiveBandCopy(wide));
  });

  it("the lit-hours coverage shrinks: narrow lights FEWER hours than wide", () => {
    renderTD(wide);
    const wideLit = litHours().length;
    cleanup();
    renderTD(narrow);
    const narrowLit = litHours().length;
    expect(narrowLit).toBeLessThan(wideLit);
  });

  it("the rendered lock + copy DOM differs between the two beliefs (not.toBe on text)", () => {
    const { container: cw } = renderTD(wide);
    const wideText = cw.querySelector('[data-testid="td-lock"]')!.textContent! + "||" + cw.querySelector('[data-testid="td-copy"]')!.textContent!;
    cleanup();
    const { container: cn } = renderTD(narrow);
    const narrowText = cn.querySelector('[data-testid="td-lock"]')!.textContent! + "||" + cn.querySelector('[data-testid="td-copy"]')!.textContent!;
    expect(narrowText).not.toBe(wideText);
  });
});

describe("TimeDetective · honesty when wide", () => {
  it("a no-event belief shows the honest 'still wide, add an event' copy, not a faked window", () => {
    renderTD(seed(birth, []));
    expect(screen.getByTestId("td-lock").textContent).toContain("还很宽");
    expect(screen.getByTestId("time-detective").getAttribute("data-wide")).toBe("1");
  });
});
