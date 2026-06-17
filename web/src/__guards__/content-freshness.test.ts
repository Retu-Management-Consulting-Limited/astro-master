import { describe, it, expect } from "vitest";
import { computeChart } from "../lib/astro/chart";
import { dailyReading } from "../lib/reading/daily";
import { dayWealth, monthWealth } from "../lib/astro/wealth";
import { generateFirstRead } from "../lib/reading/generate";
import { generateThemeRead, THEME_IDS } from "../lib/reading/theme";
import { synastry, type RelType } from "../lib/astro/synastry";
import { synScaffold } from "../lib/reading/synastry";
import { detectHighlights } from "../lib/astro/highlights";
import { biorhythm } from "../lib/biorhythm";
import { moneyPersona } from "../lib/money/persona";
import { nextChapter } from "../lib/money/narrative";
import { todayVerdict } from "../lib/reading/todayVerdict";
import { monthBody, bodyScore } from "../lib/astro/body";
import { seed, withConfidence } from "../lib/astro/timeBelief";
import { detectiveBandCopy } from "../lib/reading/calibrationSignal";
import type { LifeEvent } from "../lib/astro/rectify";

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

  it("wealth: the month rotates LEVELS across days — presentation varies (not chargedness)", () => {
    // R14: freshness asserts the PRESENTATION moves, not how 'charged' a month is.
    // The old ≥9-decisive-days floor was a chargedness assertion; it collided with
    // the deliberate rare quota (天定+保底: 慎≤4, 平淡≥60% — see wealth.ts), which
    // MAKES charged days rare on purpose. Rarity is a feature, not a freshness bug.
    // So here we assert only what a per-day surface owes: the level grid is not a
    // single frozen value, and the rare quota actually holds (rarity is shaped).
    for (const ch of [A, B, C]) {
      const days = monthWealth(ch, 2026, 6).days;
      expect(new Set(days.map((d) => d.level)).size, "a month rendered one frozen level").toBeGreaterThan(1);
      const shen = days.filter((d) => d.level === "shen").length;
      const ping = days.filter((d) => d.level === "ping").length;
      expect(shen, `慎 quota: ${shen}/30`).toBeLessThanOrEqual(4);
      expect(ping, `平淡 floor: ${ping}/30`).toBeGreaterThanOrEqual(Math.ceil(0.6 * days.length));
    }
  });
});

// #T4 身心轨 (monthBody/dayBody/bodyScore) — 身心健康轨与财运同构：按天 + 按盘两轴。
// R14/R15 登记，强形式钉在「真正按天移动的字段」上：
//   • per-day: level 受月度稀有配额(天定+保底)刻意压成一长串 calm（design/23：大多数日子
//     平稳），所以 level 不是按天真正移动的字段——在它上做相邻日 not.toBe 会退化成
//     Set.size>1 弱断言（一月只 5/29 对不同就过，正是 R15 假绿灯）。真正按天移动的是
//     intensity（原始星象分，未被配额重塑）：实测 A/B/D 29/29、C 26/29 相邻日不同。照 wealth
//     的 >20/29 强形式把 floor 钉在 intensity 上。
//   • personalized: 不同盘的整月 intensity 序列 + 同日 bodyScore not.toBe（禁 Set.size>1）。
describe("freshness contract · body/health varies by day (intensity) and by chart", () => {
  it("body: adjacent-day intensity moves on most days (>20/29) — assert the field that actually moves, not the quota-flattened level", () => {
    for (const ch of [A, B, C]) {
      const iv = monthBody(ch, 2026, 6).days.map((d) => d.intensity);
      let changes = 0;
      for (let i = 1; i < iv.length; i++) if (iv[i] !== iv[i - 1]) changes++;
      expect(changes, `body intensity changed only ${changes}/${iv.length - 1} days`).toBeGreaterThan(20);
    }
  });
  it("body: the month rotates LEVELS across days, and the rare quota actually holds (慎 low≤4, 平 calm≥60%)", () => {
    for (const ch of [A, B, C]) {
      const days = monthBody(ch, 2026, 6).days;
      expect(new Set(days.map((d) => d.level)).size, "a month rendered one frozen body level").toBeGreaterThan(1);
      const low = days.filter((d) => d.level === "low").length;
      const calm = days.filter((d) => d.level === "calm").length;
      expect(low, `low quota: ${low}/${days.length}`).toBeLessThanOrEqual(4);
      expect(calm, `calm floor: ${calm}/${days.length}`).toBeGreaterThanOrEqual(Math.ceil(0.6 * days.length));
    }
  });
  it("body is personalized: different charts → different month intensity series AND different same-day bodyScore (not.toBe)", () => {
    const sig = (ch: typeof A) => monthBody(ch, 2026, 6).days.map((d) => d.intensity).join(",");
    expect(sig(A)).not.toBe(sig(B));
    expect(sig(B)).not.toBe(sig(C));
    const day = new Date(Date.UTC(2026, 5, 16, 12));
    expect(bodyScore(A, day)).not.toBe(bodyScore(B, day));
    expect(bodyScore(B, day)).not.toBe(bodyScore(C, day));
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
      expect(text([a.planetLabel, a.paragraphs, a.quote, a.deepRead]), `theme ${id} not personalized`).not.toBe(
        text([b.planetLabel, b.paragraphs, b.quote, b.deepRead])
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

  // #5 合盘分型解读 (PR2) — the reading must vary by relationship TYPE and by PAIR.
  // Killing the mad-lib means adjacent types can't render identical copy.
  it("synastry reading differs across ADJACENT relationship types (same pair)", () => {
    const types: RelType[] = ["lover", "partner", "colleague", "friend", "family"];
    for (let i = 0; i < types.length - 1; i++) {
      const a = synScaffold(synastry(A, B, types[i]));
      const b = synScaffold(synastry(A, B, types[i + 1]));
      expect(text([a.vibe, a.body, a.catchLine]), `types ${types[i]} vs ${types[i + 1]} share copy`).not.toBe(
        text([b.vibe, b.body, b.catchLine])
      );
    }
  });
  it("synastry reading differs for different pairs (same type)", () => {
    const ab = synScaffold(synastry(A, B, "lover"));
    const ac = synScaffold(synastry(A, C, "lover"));
    expect(text([ab.vibe, ab.body, ab.catchLine])).not.toBe(text([ac.vibe, ac.body, ac.catchLine]));
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

// #T1 今日财运判词 (todayVerdict) — per-day rotating line/quote/action/prep/ask
// + per-chart, Moon-driven personalization. Registry entry — strong form on BOTH axes.
//   • per-day: ADJACENT SAME-STATE days must rotate their copy. This is the exact
//     2026-06-15「换了一天还一样」failure (same content, different day, same state),
//     so the strong invariant is asserted on same-state pairs — NOT only on the
//     easy state-change days where the line trivially differs.
//   • personalized AT THE CELL: the STRONGEST form is two charts that SHARE a lean
//     yet still render a different cell. The earlier registry only checked A vs B,
//     and A='even'/B='guard' differ in lean by construction — so that pair could
//     pass with the cell personalized only to the 3-bucket lean (a coarse proxy),
//     hiding a collapse. A and C BOTH lean 'even', so a same-lean A/C pair is the
//     adversarial case: if the cell were lean-only, A and C would render byte-
//     identical on every homomorphic (same-state) day (this was true before the
//     fix: 186/186 identical). The cell now wires in the chart's real Moon aspect
//     (daily.ts dailyAspect, Moon-driven → chart-dependent) so same-lean charts
//     diverge at the cell. Asserted directly (not.toBe), not Set(...).size>1.
describe("freshness contract · today verdict (per-day rotation + personalized lean)", () => {
  it("ADJACENT SAME-STATE days rotate line AND quote (not just state-change days)", () => {
    for (const chart of [A, B, C]) {
      let sameStatePairs = 0;
      let prev: ReturnType<typeof todayVerdict> | null = null;
      for (let i = 0; i < 365; i++) {
        const v = todayVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12)));
        if (prev && prev.state === v.state) {
          sameStatePairs++;
          expect(prev.line, `frozen line, same-state adjacent days (doy ${i})`).not.toBe(v.line);
          expect(prev.quote, `frozen quote, same-state adjacent days (doy ${i})`).not.toBe(v.quote);
        }
        prev = v;
      }
      // not-vacuous: a full year always carries many same-state runs
      expect(sameStatePairs, "too few same-state pairs to test rotation").toBeGreaterThan(50);
    }
  });

  it("two charts of different Mars/Saturn dominance get different leans (personalized)", () => {
    const leanA = todayVerdict(A, new Date(Date.UTC(2026, 5, 10, 12))).lean; // 'even'
    const leanB = todayVerdict(B, new Date(Date.UTC(2026, 5, 10, 12))).lean; // 'guard'
    expect(leanA, `A and B share lean ${leanA}`).not.toBe(leanB);
  });

  it("ADJACENT 平淡(plain) days rotate the PRESENTATION line/quote/prep (the calm cell is not a frozen void)", () => {
    // The rare quota (天定+保底) makes 平淡 the dominant state — so the calm cell
    // is what a user sees MOST days. Freshness here is presentation-layer: even
    // when the state is the same boring 平 two days running, the rendered copy
    // (line/quote/prep) must change. Asserted specifically on plain→plain pairs.
    for (const chart of [A, B, C]) {
      let plainPairs = 0;
      let prev: ReturnType<typeof todayVerdict> | null = null;
      for (let i = 0; i < 365; i++) {
        const v = todayVerdict(chart, new Date(Date.UTC(2026, 0, 1 + i, 12)));
        if (prev && prev.state === "plain" && v.state === "plain") {
          plainPairs++;
          expect(text([prev.line, prev.quote, prev.prep]), `frozen plain cell (doy ${i})`).not.toBe(
            text([v.line, v.quote, v.prep])
          );
        }
        prev = v;
      }
      // plain is the majority state under the quota, so there are plenty of pairs
      expect(plainPairs, "too few plain→plain pairs — quota not making plain dominant?").toBeGreaterThan(40);
    }
  });

  it("SAME-LEAN charts (A & C, both 'even') still render a different cell on EVERY homomorphic day", () => {
    // The strongest, adversarial form. A and C share a lean, so if the cell were
    // personalized ONLY to the 3-bucket lean, they would collapse to byte-identical
    // copy on every same-state day (was 186/186 before the Moon wiring). Here we
    // assert the cell differs on EVERY homomorphic (same-state) day across a full
    // year — not "some day differs", and explicitly NOT only on the lean-different
    // A/B pair that could hide a same-lean collapse.
    expect(todayVerdict(A, new Date(Date.UTC(2026, 5, 14, 12))).lean).toBe("even");
    expect(todayVerdict(C, new Date(Date.UTC(2026, 5, 14, 12))).lean).toBe("even");
    const cell = (v: ReturnType<typeof todayVerdict>) =>
      text([v.state, v.lean, v.line, v.quote, v.action, v.prep, v.askDidYouAct]);
    let homomorphic = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date(Date.UTC(2026, 0, 1 + i, 12));
      const a = todayVerdict(A, day);
      const c = todayVerdict(C, day);
      if (a.state !== c.state) continue;
      homomorphic++;
      expect(cell(a), `same-lean A/C share the whole cell (doy ${i}, state ${a.state})`).not.toBe(cell(c));
    }
    // not vacuous: A and C share a state on a large fraction of the year
    expect(homomorphic, "too few homomorphic A/C days to test cell personalization").toBeGreaterThan(120);
  });

  it("different charts, SAME day, render a different presentation (lean-different pair too)", () => {
    // kept as a second witness on the lean-different A/B pair.
    const day = new Date(Date.UTC(2026, 5, 14, 12));
    const cell = (v: ReturnType<typeof todayVerdict>) =>
      text([v.state, v.lean, v.line, v.quote, v.action, v.prep, v.askDidYouAct]);
    expect(cell(todayVerdict(A, day)), "A and B share the whole cell").not.toBe(cell(todayVerdict(B, day)));
  });
});

// #T3 时辰侦探 (detectiveBandCopy) — the calibration detective band is a DYNAMIC
// surface keyed on BELIEF. R14 (值会变 ≠ 呈现会变，验呈现层): the user-facing surface
// is NOT the raw belief (topRange/mode/confidence) — it is the STRING Molly speaks,
// detectiveBandCopy(belief). Asserting on the belief fields is asserting on the PROXY;
// the false-green we exist to catch is "belief moved, rendered line did NOT". So every
// assertion below pins detectiveBandCopy itself, strong-form (not.toBe), not the fields.
//
// Registry entry, strong form, on the PRESENTATION:
//   • belief axis: a wide vs a sharp belief render a DIFFERENT line.
//   • adjacency chain b0→b1→b2→b3: EACH step's rendered line differs. This is the load
//     -bearing one — it catches the prior collapse where b2 [15,5] and b3 [21,11] are
//     distinct beliefs (different topRange AND confidence) yet rendered BYTE-IDENTICAL
//     copy because the old formatter keyed only on span width (both span 14). span <=
//     hid it; the rendered string did not move. not.toBe on the chain is what exposes it.
//   • mode flip planet→house must MOVE the line. Demonstrated at the boundary via
//     withConfidence (real events on this seed top out below the house threshold, so a
//     fields-only assertion would be VACUOUS — the house branch never taken). We drive
//     confidence past the threshold explicitly and assert the copy actually changes.
// (Per-belief sibling of the per-day / per-chart contracts above. todayVerdict's STATE
//  is deliberately belief-INVARIANT — that wall is held by edge-preservation.test.ts;
//  what varies by belief is this detective band string.)
describe("freshness contract · time detective band (detectiveBandCopy) varies by BELIEF", () => {
  const birth = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
  const e1: LifeEvent = { kind: "move", year: 2019, month: 3 };
  const e2: LifeEvent = { kind: "career", year: 2021, month: 9 };
  const e3: LifeEvent = { kind: "relationship", year: 2023, month: 6 };

  it("a wide belief and a sharp belief render a DIFFERENT detective LINE (presentation moves, not just the field)", () => {
    const wide = seed(birth, []); // nothing known → whole-clock band, planet mode
    const sharp = seed(birth, [e1, e2, e3]); // corroborated → narrowed band
    // strong form: the rendered string moves, not merely the underlying topRange.
    expect(detectiveBandCopy(sharp), "sharp belief renders the same line as wide").not.toBe(
      detectiveBandCopy(wide),
    );
  });

  it("EACH step of the belief chain b0→b1→b2→b3 renders a DIFFERENT line (catches the b2/b3 byte-identical collapse)", () => {
    const chain = [
      seed(birth, []),
      seed(birth, [e1]),
      seed(birth, [e1, e2]),
      seed(birth, [e1, e2, e3]),
    ];
    const lines = chain.map(detectiveBandCopy);
    // adjacency: every neighbouring pair differs — the span<= chain alone let b2/b3
    // collapse to identical copy; this not.toBe on the RENDERED line forbids it.
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i], `belief step ${i - 1}→${i} rendered an identical detective line`).not.toBe(
        lines[i - 1],
      );
    }
    // and not vacuous: all four lines are mutually distinct (the surface never repeats
    // across the whole accrual path, not just between neighbours).
    expect(new Set(lines).size, "the four belief lines are not all distinct").toBe(lines.length);
  });

  it("the planet→house mode flip MOVES the rendered line (asserted at the boundary, not vacuously)", () => {
    // Real events on this seed top out below 0.5, so seed() alone keeps mode='planet'
    // for every belief — a fields-only test of the flip would be vacuous. Drive the
    // confidence past the house threshold explicitly and assert the COPY changes.
    const sharp = seed(birth, [e1, e2, e3]);
    expect(sharp.mode, "fixture precondition: real-event belief is still planet-mode").toBe("planet");
    const asHouse = withConfidence(sharp, 0.6); // same band, now over the house threshold
    expect(asHouse.mode).toBe("house");
    expect(asHouse.topRange, "withConfidence must not move the band, only the mode").toEqual(
      sharp.topRange,
    );
    // same hour window, only the mode crossed — the rendered line must still differ.
    expect(detectiveBandCopy(asHouse), "mode flip did not move the detective line").not.toBe(
      detectiveBandCopy(sharp),
    );
  });
});
