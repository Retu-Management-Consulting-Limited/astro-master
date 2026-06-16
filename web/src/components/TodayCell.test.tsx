// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TodayCell } from "./TodayCell";
import { computeChart } from "@/lib/astro/chart";
import { todayVerdict } from "@/lib/reading/todayVerdict";
import { dailyReading } from "@/lib/reading/daily";
import { validateMoneyCopy } from "@/lib/money/guardrail";

afterEach(cleanup);

// Fixture A + the three dates the probe found produce one of each state in 2026:
//   plain 2026-01-01 · red 2026-01-11 · green 2026-01-13
const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const D = (iso: string) => new Date(iso);
const PLAIN = D("2026-01-01T12:00:00.000Z");
const RED = D("2026-01-11T12:00:00.000Z");
const GREEN = D("2026-01-13T12:00:00.000Z");

function renderAt(date: Date, onWealth = vi.fn()) {
  const v = todayVerdict(A, date);
  const daily = dailyReading(A, date);
  render(<TodayCell verdict={v} daily={daily} onWealth={onWealth} />);
  return { v, daily, onWealth };
}

describe("TodayCell · three-state 今 card", () => {
  it("plain state renders: 平/天清 tag, the verdict line, and a NON-EMPTY 备战糖(prep)", () => {
    const { v } = renderAt(PLAIN);
    expect(v.state).toBe("plain");
    expect(screen.getByTestId("today-card")).toBeTruthy();
    // verdict line is shown verbatim
    expect(screen.getByText(v.line)).toBeTruthy();
    // 平淡日不空屏：备战糖 slot present + non-empty + carries the verdict's prep text
    const prep = screen.getByTestId("today-prep");
    expect(prep.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(prep.textContent).toContain(v.prep!);
  });

  it("red state renders: 慎 tag, the command line, the amnesty sugar, and a DOOR pointing to that day's wealth", () => {
    const onWealth = vi.fn();
    const { v } = renderAt(RED, onWealth);
    expect(v.state).toBe("red");
    expect(screen.getByText(v.line)).toBeTruthy();
    expect(screen.getByText(v.quote)).toBeTruthy(); // 赦免糖
    // 红日必有门：a door element exists and taps through to /wealth for doorDate's day
    const door = screen.getByTestId("today-door");
    expect(door).toBeTruthy();
    fireEvent.click(door);
    const day = Number(v.doorDate!.slice(-2)); // 11
    expect(onWealth).toHaveBeenCalledWith(day);
  });

  it("green state renders: 旺 badge, the command line, an ACTION, and the fortune chip", () => {
    const { v } = renderAt(GREEN);
    expect(v.state).toBe("green");
    expect(screen.getByText(v.line)).toBeTruthy();
    expect(screen.getByTestId("today-wang-badge")).toBeTruthy(); // 可晒"财运旺"
    const act = screen.getByTestId("today-action");
    expect(act.textContent).toContain(v.action!);
  });

  it("every state renders a fortune chip that taps to /wealth", () => {
    for (const date of [PLAIN, RED, GREEN]) {
      const onWealth = vi.fn();
      renderAt(date, onWealth);
      const chip = screen.getByTestId("fortune-chip");
      fireEvent.click(chip);
      expect(onWealth).toHaveBeenCalled();
      cleanup();
    }
  });

  it("all rendered money copy passes the money guardrail (真 vs 编 · §8)", () => {
    for (const date of [PLAIN, RED, GREEN]) {
      const { v } = renderAt(date);
      const card = screen.getByTestId("today-card");
      const res = validateMoneyCopy(card.textContent ?? "");
      expect(res.ok, `guardrail failed (${v.state}): ${res.reason} · ${card.textContent}`).toBe(true);
      cleanup();
    }
  });
});
