import { describe, it, expect } from "vitest";
import { computeChart } from "../lib/astro/chart";
import { dailyReading } from "../lib/reading/daily";
import { dayWealth, monthWealth } from "../lib/astro/wealth";
import { generateFirstRead } from "../lib/reading/generate";
import { generateThemeRead, THEME_IDS } from "../lib/reading/theme";
import { synastry } from "../lib/astro/synastry";
import { detectHighlights } from "../lib/astro/highlights";
import { biorhythm } from "../lib/biorhythm";
import { moneyPersona } from "../lib/money/persona";
import { nextChapter } from "../lib/money/narrative";

// ─────────────────────────────────────────────────────────────────────────────
// 动态内容契约 (FRESHNESS CONTRACT) — see CLAUDE.md & design/DESIGN-SYSTEM.md.
//
// Root cause of the 2026-06-15「换了一天还一样」bug: content that CLAIMS to vary
// along an axis (day / user-chart / pair) actually rendered identically, because
// the variation test asserted a WEAK property (`new Set(...).size > 1`) instead
// of the real invariant. A weak assertion is a false green light.
//
// THE RULE (enforced here, in CI): every surface that claims to be dynamic ships
// an assertion of the STRONG form of its variation —
//   • per-day surfaces  → ADJACENT days must differ (not "some day differs")
//   • personalized      → two clearly-different charts must produce different copy
//   • pair-based        → two different pairs must produce different output
// This file is also the REGISTRY of surfaces under contract. Add a block here
// when you add a new dynamic surface; do not weaken an assertion to make it pass.
// ─────────────────────────────────────────────────────────────────────────────

// Two deliberately dissimilar natal charts (Gemini-Sun vs Scorpio-Sun, different
// hemispheres/times) + a third for pair variation.
const A = computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 });
const B = computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 });
const C = computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 });

const text = (parts: unknown[]) => parts.map((p) => JSON.stringify(p)).join("|");

describe("freshness contract · money narrative (per-day + personalized)", () => {
  it("adjacent days produce a different hopeNote (per-day surface)", () => {
    const p = moneyPersona(A);
    for (let i = 0; i < 30; i++) {
      const a = nextChapter(p, A, new Date(Date.UTC(2026, 0, 1 + i, 12)), []);
      const b = nextChapter(p, A, new Date(Date.UTC(2026, 0, 2 + i, 12)), []);
      expect(a.hopeNote).not.toBe(b.hopeNote);
    }
  });
  it("two clearly-different charts produce a different money persona (personalized)", () => {
    expect(text([moneyPersona(A)])).not.toBe(text([moneyPersona(B)]));
  });
});

describe("freshness contract · per-day surfaces differ on ADJACENT days", () => {
  it("daily reading: todayLine + todayQuote differ every consecutive day", () => {
    // (also asserted in reading/daily.test.ts; kept here as the registry entry)
    for (let i = 0; i < 40; i++) {
      const a = dailyReading(A, new Date(Date.UTC(2026, 0, 1 + i, 9)));
      const b = dailyReading(A, new Date(Date.UTC(2026, 0, 2 + i, 9)));
      expect(a.todayLine).not.toBe(b.todayLine);
      expect(a.todayQuote).not.toBe(b.todayQuote);
    }
  });

  it("wealth: daily intensity is not frozen across the month", () => {
    const days = Array.from({ length: 30 }, (_, i) => dayWealth(A, 2026, 6, 1 + i).intensity);
    // strong form: it must move most days, not merely "have 2 distinct values"
    const changes = days.slice(1).filter((v, i) => v !== days[i]).length;
    expect(changes, `intensity changed only ${changes}/29 days`).toBeGreaterThan(20);
  });

  it("wealth: the month is decisive — not a wall of 平 (felt-signal L1)", () => {
    // The event layer must keep charts out of the all-平 mush. Per-chart-per-month
    // varies (a quiet money-month can be ~7/30); the strong guard is on the mean
    // across charts ≥ 9 + every chart clearly above the all-平 floor. The full
    // population target (平≈52%) is verified by the pre-deploy 192-chart shadow run.
    const counts = [A, B, C].map((ch) => monthWealth(ch, 2026, 6).days.filter((d) => d.level !== "ping").length);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(mean, `mean decisive ${mean}/30`).toBeGreaterThanOrEqual(9);
    for (const c of counts) expect(c, `a chart had only ${c}/30 decisive days`).toBeGreaterThanOrEqual(5);
  });
});

describe("freshness contract · personalized surfaces differ between charts", () => {
  it("daily reading is personalized (different chart → different reading on the same day)", () => {
    const d = new Date(Date.UTC(2026, 5, 14, 12));
    const a = dailyReading(A, d);
    const b = dailyReading(B, d);
    expect(text([a.todayLine, a.yesterdayClaim, a.moonSign, a.backdropLine])).not.toBe(
      text([b.todayLine, b.yesterdayClaim, b.moonSign, b.backdropLine])
    );
  });

  it("first-read is personalized (different chart → different copy)", () => {
    const a = generateFirstRead(A);
    const b = generateFirstRead(B);
    expect(text([a.lead, a.quote, a.paragraphs, a.chips])).not.toBe(text([b.lead, b.quote, b.paragraphs, b.chips]));
  });

  it("every theme read is personalized (different chart → different copy)", () => {
    for (const id of THEME_IDS) {
      const a = generateThemeRead(A, id);
      const b = generateThemeRead(B, id);
      expect(text([a.planetLabel, a.paragraphs, a.quote]), `theme ${id} not personalized`).not.toBe(
        text([b.planetLabel, b.paragraphs, b.quote])
      );
    }
  });

  it("highlights are personalized (different chart → different highlight set)", () => {
    const a = detectHighlights(A);
    const b = detectHighlights(B);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(text(a.map((h) => h.summary))).not.toBe(text(b.map((h) => h.summary)));
  });

  it("month wealth is personalized (different chart → different golden days / profile)", () => {
    const a = monthWealth(A, 2026, 6);
    const b = monthWealth(B, 2026, 6);
    expect(text([a.goldenDays, a.days.map((d) => d.intensity)])).not.toBe(
      text([b.goldenDays, b.days.map((d) => d.intensity)])
    );
  });

  it("named money-events are personalized (different chart → different windows)", () => {
    const sig = (ch: typeof A) => monthWealth(ch, 2026, 6).events.map((w) => `${w.planet}:${w.startDay}-${w.endDay}`).join("|");
    expect(sig(A)).not.toBe(sig(B));
  });
});

describe("freshness contract · pair surfaces differ between pairs", () => {
  it("synastry differs for different pairs (same type)", () => {
    const ab = synastry(A, B, "lover");
    const ac = synastry(A, C, "lover");
    expect(text([ab.total, ab.dims])).not.toBe(text([ac.total, ac.dims]));
  });
});

// biorhythm today-card: per-day AND per-birthday. Registry entry — strong form.
describe("freshness contract · biorhythm varies by day and by birthday", () => {
  const birth1 = new Date(1998, 5, 13);
  const birth2 = new Date(1990, 2, 21);
  it("ADJACENT days differ (the curve moves every day)", () => {
    for (let i = 0; i < 40; i++) {
      const a = biorhythm(birth1, new Date(2026, 0, 1 + i));
      const b = biorhythm(birth1, new Date(2026, 0, 2 + i));
      expect(text([a.physical, a.emotional, a.intellectual])).not.toBe(text([b.physical, b.emotional, b.intellectual]));
    }
  });
  it("two different birthdays give different curves on the same day", () => {
    const d = new Date(2026, 5, 15);
    const a = biorhythm(birth1, d);
    const b = biorhythm(birth2, d);
    expect(text([a.physical, a.emotional, a.intellectual])).not.toBe(text([b.physical, b.emotional, b.intellectual]));
  });
});
