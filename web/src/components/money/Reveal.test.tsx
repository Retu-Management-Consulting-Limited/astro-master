// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Reveal } from "./Reveal";
import { computeChart, type BirthInput } from "@/lib/astro/chart";
import { moneyPersona } from "@/lib/money/persona";

vi.mock("@/lib/track", () => ({ track: vi.fn() }));

afterEach(cleanup);

const chart = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8, lng: 144.9, tz: 10 } as BirthInput);
const persona = moneyPersona(chart);

describe("Reveal", () => {
  it("shows the confident meaning assertion (not '说中了吗')", () => {
    render(<Reveal persona={persona} onContinue={() => {}} onCorrect={() => {}} />);
    expect(screen.getByText(/钱对你/)).toBeTruthy();
    expect(screen.queryByText(/说中了吗/)).toBeNull(); // v4: 看得更多, not 可能看错
  });

  it("reaching the correct step asks which facet is heavier (看得更多 framing)", () => {
    render(<Reveal persona={persona} onContinue={() => {}} onCorrect={() => {}} />);
    fireEvent.click(screen.getByText(/看我的金钱故事/));
    expect(screen.getByText(/另一面|更像此刻的你/)).toBeTruthy();
  });
});
