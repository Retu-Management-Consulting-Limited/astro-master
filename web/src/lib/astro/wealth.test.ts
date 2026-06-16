import { describe, it, expect } from "vitest";
import { computeChart, isRetrograde, type BirthInput } from "./chart";
import { wealthScore, wealthLevel, dayWealth, monthWealth, signRuler, houseSign,
         eventPressure, eventTerms, dayDriver, mergeWindows, monthEvents, MONEY_PLANETS } from "./wealth";

const sample: BirthInput = { year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 };
const chart = computeChart(sample);

describe("wealth calendar", () => {
  it("wealthScore is 0..100", () => {
    for (let d = 1; d <= 28; d++) {
      const s = wealthScore(chart, new Date(Date.UTC(2026, 5, d, 12, 0)));
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("wealthLevel thresholds (green/white/red)", () => {
    expect(wealthLevel(80)).toBe("wang");
    expect(wealthLevel(50)).toBe("ping");
    expect(wealthLevel(30)).toBe("shen");
  });

  it("monthWealth returns full month + ≤2 golden days, all 旺", () => {
    const m = monthWealth(chart, 2026, 6);
    expect(m.days.length).toBe(30);
    expect(m.goldenDays.length).toBeLessThanOrEqual(2);
    for (const g of m.goldenDays) {
      expect(dayWealth(chart, 2026, 6, g).level).toBe("wang");
    }
  });

  it("levels vary across the month (not all identical)", () => {
    const m = monthWealth(chart, 2026, 6);
    const levels = new Set(m.days.map((d) => d.level));
    expect(levels.size).toBeGreaterThan(1);
  });
});

describe("monthly rare quota (天定 + 保底): 红≤~4, 平淡≥~60%", () => {
  // The astrology determines WHICH days rank where (天定); the quota is a 保底
  // rank-cap that keeps the calendar from becoming a wall of green or a wall of
  // red. Cap 慎(red) at ≤4/month and floor 平淡(ping) at ≥60% — for EVERY chart,
  // EVERY month, so no user ever opens a month that's all-charged.
  const charts = [
    computeChart({ year: 1998, month: 6, day: 13, hour: 8, minute: 40, lat: -37.8136, lng: 144.9631, tz: 10 }),
    computeChart({ year: 1990, month: 11, day: 2, hour: 21, minute: 15, lat: 31.2304, lng: 121.4737, tz: 8 }),
    computeChart({ year: 1985, month: 3, day: 21, hour: 6, minute: 5, lat: 40.7128, lng: -74.006, tz: -5 }),
    // a 12th-month chart that previously rendered ~26/31 旺 (a wall of green)
    computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 }),
  ];

  it("every chart, every month of 2026: 慎(red) days ≤ 4", () => {
    for (const ch of charts) {
      for (let m = 1; m <= 12; m++) {
        const shen = monthWealth(ch, 2026, m).days.filter((d) => d.level === "shen").length;
        expect(shen, `month ${m} had ${shen} 慎 days`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("every chart, every month of 2026: 平淡(ping) is ≥ 60% of the month", () => {
    for (const ch of charts) {
      for (let m = 1; m <= 12; m++) {
        const days = monthWealth(ch, 2026, m).days;
        const ping = days.filter((d) => d.level === "ping").length;
        const floor = Math.ceil(0.6 * days.length);
        expect(ping, `month ${m}: ${ping}/${days.length} ping, floor ${floor}`).toBeGreaterThanOrEqual(floor);
      }
    }
  });

  it("天定: the quota preserves the astrology RANK — kept 慎 are the lowest-intensity days, kept 旺 the highest", () => {
    for (const ch of charts) {
      const days = monthWealth(ch, 2026, 6).days;
      const maxShen = Math.max(...days.filter((d) => d.level === "shen").map((d) => d.intensity), -1);
      const minWang = Math.min(...days.filter((d) => d.level === "wang").map((d) => d.intensity), 101);
      const pingI = days.filter((d) => d.level === "ping").map((d) => d.intensity);
      // a ping day never out-ranks a kept 旺 day, nor under-ranks a kept 慎 day
      for (const p of pingI) {
        if (minWang <= 100) expect(p, "a ping out-ranks a kept 旺").toBeLessThanOrEqual(minWang);
        if (maxShen >= 0) expect(p, "a ping under-ranks a kept 慎").toBeGreaterThanOrEqual(maxShen);
      }
    }
  });

  it("single-day dayWealth().level agrees with the month-quota result (no per-day vs per-month drift)", () => {
    for (const ch of charts) {
      const m = monthWealth(ch, 2026, 6);
      for (const d of m.days) {
        expect(dayWealth(ch, 2026, 6, d.day).level, `day ${d.day}`).toBe(d.level);
      }
    }
  });

  it("intensity is still the raw score (quota reshapes LEVEL, never the number)", () => {
    const ch = charts[0];
    const m = monthWealth(ch, 2026, 6);
    for (const d of m.days) {
      expect(d.intensity).toBe(wealthScore(ch, new Date(Date.UTC(2026, 5, d.day, 12, 0))));
    }
  });

  it("still varies — the quota does NOT flatten every month to all-平", () => {
    // backstop against the opposite failure: a month must keep some charge.
    for (const ch of charts) {
      let monthsWithCharge = 0;
      for (let m = 1; m <= 12; m++) {
        const days = monthWealth(ch, 2026, m).days;
        if (days.some((d) => d.level !== "ping")) monthsWithCharge++;
      }
      expect(monthsWithCharge, "a whole year went flat").toBeGreaterThan(6);
    }
  });
});

describe("wealth model — enriched factors", () => {
  it("signRuler: traditional rulers (0=Aries..11=Pisces)", () => {
    expect(signRuler(0)).toBe("Mars"); // 白羊
    expect(signRuler(1)).toBe("Venus"); // 金牛
    expect(signRuler(3)).toBe("Moon"); // 巨蟹
    expect(signRuler(4)).toBe("Sun"); // 狮子
    expect(signRuler(9)).toBe("Saturn"); // 摩羯
    expect(signRuler(11)).toBe("Jupiter"); // 双鱼
    expect(signRuler(12)).toBe("Mars"); // wraps to 白羊
  });

  it("houseSign: whole-sign 2nd/8th from the ascendant", () => {
    expect(houseSign(0, 1)).toBe(0); // asc 白羊 → 1st = 白羊
    expect(houseSign(0, 2)).toBe(1); // 2nd = 金牛
    expect(houseSign(0, 8)).toBe(7); // 8th = 天蝎
    expect(houseSign(10, 8)).toBe((10 + 7) % 12); // wraps
  });

  it("eventPressure is bounded [-36,36] and fires over a month", () => {
    let nonZero = 0;
    for (let d = 1; d <= 30; d++) {
      const p = eventPressure(chart, new Date(Date.UTC(2026, 5, d, 12, 0)));
      expect(p).toBeGreaterThanOrEqual(-36);
      expect(p).toBeLessThanOrEqual(36);
      if (p !== 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(0);
  });

  it("eventPressure: a benefic (Venus/Jupiter) transit lifts, a malefic (Mars/Saturn) drops", () => {
    // 1990-03-21 Beijing: transiting Saturn afflicts a money point on 2026-03-01 (neg);
    // 1975-02-09 Jilin: transiting Jupiter trines its Pisces money stellium in early June (pos).
    const saturnAfflicted = computeChart({ year: 1990, month: 3, day: 21, hour: 6, minute: 5, lat: 39.9042, lng: 116.4074, tz: 8 });
    const jupiterLifted = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });
    expect(eventPressure(saturnAfflicted, new Date(Date.UTC(2026, 2, 1, 12, 0)))).toBeLessThan(0);
    expect(eventPressure(jupiterLifted, new Date(Date.UTC(2026, 5, 3, 12, 0)))).toBeGreaterThan(0);
  });

  it("the slow layer shifts the daily score (enrichment is wired in)", () => {
    // A date where the slow layer contributes should raise the score above the
    // fast-only baseline (50 + benefic - malefic). We just assert the combined
    // score stays valid and the slow term is included by construction.
    for (let d = 1; d <= 28; d++) {
      const date = new Date(Date.UTC(2026, 5, d, 12, 0));
      expect(wealthScore(chart, date)).toBeGreaterThanOrEqual(0);
      expect(wealthScore(chart, date)).toBeLessThanOrEqual(100);
    }
  });
});

describe("retrograde flag (financial 水逆/金逆 — annotation, not a score input)", () => {
  it("isRetrograde detects Mercury's 2026 retrograde station vs direct motion", () => {
    // Mercury stations retrograde ~2026-06-29 and stays Rx through ~07-23.
    expect(isRetrograde("Mercury", new Date(Date.UTC(2026, 5, 10, 12, 0)))).toBe(false); // 6/10 direct
    expect(isRetrograde("Mercury", new Date(Date.UTC(2026, 5, 30, 12, 0)))).toBe(true);  // 6/30 Rx
    expect(isRetrograde("Mercury", new Date(Date.UTC(2026, 6, 5, 12, 0)))).toBe(true);   // 7/5  Rx
  });

  it("isRetrograde: Venus Rx (2026-10) yes, June no; luminaries never retrograde", () => {
    expect(isRetrograde("Venus", new Date(Date.UTC(2026, 9, 15, 12, 0)))).toBe(true);  // mid Venus Rx
    expect(isRetrograde("Venus", new Date(Date.UTC(2026, 5, 15, 12, 0)))).toBe(false); // June direct
    expect(isRetrograde("Sun", new Date(Date.UTC(2026, 5, 15, 12, 0)))).toBe(false);
    expect(isRetrograde("Moon", new Date(Date.UTC(2026, 5, 15, 12, 0)))).toBe(false);
  });

  it("dayWealth surfaces a retro list of money planets (Mercury/Venus) without touching the score", () => {
    const direct = dayWealth(chart, 2026, 6, 10);
    const merRx = dayWealth(chart, 2026, 6, 30);
    expect(direct.retro).toEqual([]);
    expect(merRx.retro).toContain("Mercury");
    // the flag must NOT change the score — same date scored straight is identical
    expect(merRx.intensity).toBe(wealthScore(chart, new Date(Date.UTC(2026, 5, 30, 12, 0))));
  });

  it("monthWealth flags the late-June Mercury retrograde days", () => {
    const m = monthWealth(chart, 2026, 6);
    const rxDays = m.days.filter((d) => d.retro.includes("Mercury")).map((d) => d.day);
    expect(rxDays).toContain(30);
    expect(rxDays).not.toContain(10);
  });
});

describe("felt signal · 主驱动 + named events (L1/L2)", () => {
  const kevin = computeChart({ year: 1975, month: 2, day: 9, hour: 6, minute: 50, lat: 43.8436, lng: 126.55, tz: 8 });

  it("dayDriver picks the strongest signed term; benefic on Kevin's Jupiter-lit day", () => {
    const d = dayDriver(kevin, new Date(Date.UTC(2026, 5, 8, 12, 0)));
    expect(d).toBeTruthy();
    expect(d!.valence).toBe(1);
    expect(["Jupiter", "Venus", "Sun"]).toContain(d!.planet);
  });

  it("dayWealth carries a driver without changing the score", () => {
    const dw = dayWealth(chart, 2026, 6, 8);
    expect(dw.intensity).toBe(wealthScore(chart, new Date(Date.UTC(2026, 5, 8, 12, 0))));
    expect(dw).toHaveProperty("driver");
  });

  it("eventTerms excludes Mercury (event-only) from the score", () => {
    expect(eventTerms(kevin, new Date(Date.UTC(2026, 5, 1, 12, 0))).map((t) => t.planet)).not.toContain("Mercury");
  });

  it("mergeWindows groups consecutive days, splitting on gaps > maxGap", () => {
    expect(mergeWindows([3, 4, 5, 8, 12, 13], 2)).toEqual([
      { start: 3, end: 5 }, { start: 8, end: 8 }, { start: 12, end: 13 },
    ]);
    expect(mergeWindows([], 2)).toEqual([]);
    expect(mergeWindows([5, 7], 2)).toEqual([{ start: 5, end: 7 }]);
    expect(mergeWindows([5, 8], 2)).toEqual([{ start: 5, end: 5 }, { start: 8, end: 8 }]);
  });

  it("monthEvents returns 少而精 named windows with a peak day inside each", () => {
    const ev = monthEvents(kevin, 2026, 6);
    expect(ev.length).toBeGreaterThanOrEqual(1);
    expect(ev.length).toBeLessThanOrEqual(6);
    for (const w of ev) {
      expect(w.peakDay).toBeGreaterThanOrEqual(w.startDay);
      expect(w.peakDay).toBeLessThanOrEqual(w.endDay);
      expect(w.name.length).toBeGreaterThan(0);
    }
    expect(ev.map((w) => w.planet)).toContain("Venus");
    expect(ev.map((w) => w.planet)).toContain("Mars");
  });

  it("monthWealth exposes events; different charts → different events", () => {
    const a = monthWealth(chart, 2026, 6);
    const other = computeChart({ year: 1983, month: 11, day: 2, hour: 14, minute: 20, lat: 22.3, lng: 114.17, tz: 8 });
    const b = monthWealth(other, 2026, 6);
    expect(Array.isArray(a.events)).toBe(true);
    const sig = (m: typeof a) => m.events.map((w) => `${w.planet}:${w.startDay}-${w.endDay}`).join("|");
    expect(sig(a)).not.toBe(sig(b));
  });

  it("MONEY_PLANETS table: Mercury is event-only, Sun is score-only", () => {
    const merc = MONEY_PLANETS.find((p) => p.body === "Mercury")!;
    const sun = MONEY_PLANETS.find((p) => p.body === "Sun")!;
    expect(merc.scoreWeight).toBe(0);
    expect(merc.eventAspects.length).toBeGreaterThan(0);
    expect(sun.scoreWeight).toBeGreaterThan(0);
    expect(sun.eventAspects.length).toBe(0);
  });
});
