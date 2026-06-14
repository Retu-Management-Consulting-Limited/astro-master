import type { Chart } from "./chart";

// Shared structural validator for a chart received at an API boundary (R11:
// fail-fast before expensive work). The reading/chat routes used to check only
// `!chart?.placements`, so an empty array or a chart missing the Moon slipped
// through and threw a 500 downstream (generateFirstRead dereferences Sun/Moon;
// detectHighlights iterates aspects). This guards exactly those assumptions.

// Bodies that downstream code dereferences by name; their absence throws.
const REQUIRED_BODIES = ["Sun", "Moon"] as const;

export function isFullChart(chart: unknown): chart is Chart {
  if (!chart || typeof chart !== "object") return false;
  const c = chart as Record<string, unknown>;
  if (!Array.isArray(c.placements) || c.placements.length === 0) return false;
  if (!Array.isArray(c.aspects)) return false;
  if (typeof c.ascSign !== "string" || c.ascSign.length === 0) return false;
  const bodies = new Set(
    c.placements
      .filter((p): p is { body: unknown } => !!p && typeof p === "object")
      .map((p) => (p as { body: unknown }).body),
  );
  return REQUIRED_BODIES.every((b) => bodies.has(b));
}
