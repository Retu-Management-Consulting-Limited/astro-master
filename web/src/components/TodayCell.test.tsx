// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { TodayCell } from "./TodayCell";
import { computeChart } from "@/lib/astro/chart";
import { todayVerdict } from "@/lib/reading/todayVerdict";
import { dailyReading } from "@/lib/reading/daily";
import { validateMoneyCopy } from "@/lib/money/guardrail";

afterEach(cleanup);

// TodayCell 文案走 next-intl 翻译（namespace today.cell），需 provider 注入 messages。
// 默认 locale zh，故既有「身心/财运旺」等中文断言原样保留（zh 逐字搬入 messages）。
const ZH = loadMessages("zh");

// Fixture A + the three dates the probe found produce one of each state in 2026:
//   plain 2026-01-01 · red 2026-01-11 · green 2026-01-13
const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const D = (iso: string) => new Date(iso);
const PLAIN = D("2026-01-01T12:00:00.000Z");
const RED = D("2026-01-11T12:00:00.000Z");
const GREEN = D("2026-01-13T12:00:00.000Z");

function renderAt(date: Date, onWealth = vi.fn(), onBody = vi.fn()) {
  const v = todayVerdict(A, date);
  const daily = dailyReading(A, date);
  render(
    <NextIntlClientProvider locale="zh" messages={ZH}>
      <TodayCell verdict={v} daily={daily} onWealth={onWealth} onBody={onBody} />
    </NextIntlClientProvider>,
  );
  return { v, daily, onWealth, onBody };
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

  // ── T4 Phase 3 · 双 chip（财运 + 身心，恒在，主导加亮）─────────────────────
  it("每一态都恒在两条 chip：fortune-chip(→/wealth) + body-chip(→/body)", () => {
    for (const date of [PLAIN, RED, GREEN]) {
      const onWealth = vi.fn();
      const onBody = vi.fn();
      renderAt(date, onWealth, onBody);
      // 财运 chip → /wealth
      const fortune = screen.getByTestId("fortune-chip");
      expect(fortune).toBeTruthy();
      // 身心 chip → /body（对称，每天都在）
      const body = screen.getByTestId("body-chip");
      expect(body).toBeTruthy();
      fireEvent.click(body);
      expect(onBody).toHaveBeenCalled();
      expect(onWealth).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("身心 chip 的文案带「身心」字样 + 看身心日历入口（说倾向、不诊断）", () => {
    for (const date of [PLAIN, RED, GREEN]) {
      renderAt(date);
      const body = screen.getByTestId("body-chip");
      expect(body.textContent).toContain("身心");
      expect(body.textContent).toContain("身心日历");
      // 不点器官病种：chip 是入口 + 倾向词，不出现诊断式断言
      expect(body.textContent).not.toMatch(/有病|患了|确诊|癌|心脏病/);
      cleanup();
    }
  });

  it("主导轨那条 chip 加亮领头（data-lead），另一条不加亮——按 verdict.channel", () => {
    for (const date of [PLAIN, RED, GREEN]) {
      const { v } = renderAt(date);
      const fortune = screen.getByTestId("fortune-chip");
      const body = screen.getByTestId("body-chip");
      const fortuneLead = fortune.getAttribute("data-lead") === "true";
      const bodyLead = body.getAttribute("data-lead") === "true";
      // 恰有一条领头
      expect(fortuneLead !== bodyLead).toBe(true);
      // 领头那条 = 主导 channel
      if (v.channel === "钱") {
        expect(fortuneLead).toBe(true);
        expect(bodyLead).toBe(false);
      } else {
        expect(bodyLead).toBe(true);
        expect(fortuneLead).toBe(false);
      }
      cleanup();
    }
  });

  it("两条 chip 的状态点颜色用与财运同一套红/绿/平语义（不另起配色）", () => {
    // 身心 chip 的状态色由 verdict.bodyState 决定，且取值只能落在红/绿/平三色集合内
    const RGP = new Set(["var(--red)", "var(--green)", "var(--cream-dim)"]);
    for (const date of [PLAIN, RED, GREEN]) {
      const { v } = renderAt(date);
      const dot = screen.getByTestId("body-chip-dot");
      // dot 用 background 表态——必须属于红/绿/平这同一组（不是新起的 teal 等）
      expect(RGP.has(dot.style.background)).toBe(true);
      // 且严格对应 bodyState：red→红、green→绿、plain→平
      const expected = v.bodyState === "red" ? "var(--red)" : v.bodyState === "green" ? "var(--green)" : "var(--cream-dim)";
      expect(dot.style.background).toBe(expected);
      cleanup();
    }
  });

  // ── T4 i18n：文案走 today.cell namespace；ru 切换后无中文残留 ──
  it("zh 状态 tag/chip 文案逐字来自 messages（namespace today.cell）", () => {
    renderAt(GREEN);
    const card = screen.getByTestId("today-card");
    expect(card.textContent).toContain("今天 · 宜");
    expect(card.textContent).toContain("财运旺 · 搞钱黄金日");
    expect(card.textContent).toContain("看财运日历");
    expect(card.textContent).toContain("看身心日历");
  });

  it("切到 ru：状态 tag/chip 出俄文、无中文残留", () => {
    const RU = loadMessages("ru");
    const v = todayVerdict(A, GREEN);
    const daily = dailyReading(A, GREEN);
    render(
      <NextIntlClientProvider locale="ru" messages={RU}>
        <TodayCell verdict={v} daily={daily} onWealth={vi.fn()} onBody={vi.fn()} />
      </NextIntlClientProvider>,
    );
    const card = screen.getByTestId("today-card");
    // 俄文出现
    expect(card.textContent).toContain("Финансовая удача");
    expect(card.textContent).toContain("Тело и разум");
    // 无 CJK 残留（排除 props 来的 verdict.line/quote —— 那是 C 区动态内容，不在本任务范围）
    const chrome = [
      screen.getByTestId("fortune-chip").textContent ?? "",
      screen.getByTestId("body-chip").textContent ?? "",
    ].join(" ");
    expect(chrome).not.toMatch(/[一-鿿]/);
    cleanup();
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
