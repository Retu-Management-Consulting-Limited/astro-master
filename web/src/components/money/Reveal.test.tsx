// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { Reveal } from "./Reveal";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona } from "@/lib/money/persona";

vi.mock("@/lib/track", () => ({ track: vi.fn() }));

afterEach(cleanup);

// Reveal 文案走 next-intl（namespace money.reveal），需 provider 注入 messages。
// 默认 locale zh，故既有中文断言原样保留（zh 逐字搬入 messages）。
const ZH = loadMessages("zh");

const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8, lng: 144.9, tz: 10 } as BirthInput);
const persona = moneyPersona(chart);

function renderReveal() {
  return render(
    <NextIntlClientProvider locale="zh" messages={ZH}>
      <Reveal persona={persona} onContinue={() => {}} onCorrect={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("Reveal", () => {
  it("shows the confident meaning assertion (not '说中了吗')", () => {
    renderReveal();
    expect(screen.getByText(/钱对你/)).toBeTruthy();
    expect(screen.queryByText(/说中了吗/)).toBeNull(); // v4: 看得更多, not 可能看错
  });

  it("reaching the correct step asks which facet is heavier (看得更多 framing)", () => {
    renderReveal();
    fireEvent.click(screen.getByText(/看我的金钱故事/));
    expect(screen.getByText(/另一面|更像此刻的你/)).toBeTruthy();
  });
});
