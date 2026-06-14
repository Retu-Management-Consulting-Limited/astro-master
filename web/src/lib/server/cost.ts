import "server-only";
import { getKV } from "./store";

// Lightweight LLM cost monitoring. Token counts are authoritative (from the API
// usage). The USD figure is a best-effort estimate from an editable price table
// — UPDATE PRICES to the real per-1M-token rates; it is not billing.
//
// Aggregation is per-day RMW on cost:<date>; under heavy concurrency a few
// increments can be lost — acceptable for monitoring (not billing).

// USD per 1,000,000 tokens. TODO: confirm against current Anthropic pricing.
const PRICE: Record<string, { in: number; out: number }> = {
  haiku: { in: 1, out: 5 },
  sonnet: { in: 3, out: 15 },
  opus: { in: 15, out: 75 },
};

interface ModelAgg {
  calls: number;
  inTok: number;
  outTok: number;
}
interface DayAgg {
  date: string;
  calls: number;
  byModel: Record<string, ModelAgg>;
}

const dayKey = (date: string) => `cost:${date}`;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function logUsage(
  entry: { route: string; model: string; inTok: number; outTok: number },
  nowMs = Date.now(),
): Promise<void> {
  const kv = await getKV();
  const date = isoDate(nowMs);
  const prev = ((await kv.get(dayKey(date))) as DayAgg | null) ?? { date, calls: 0, byModel: {} };
  const m = prev.byModel[entry.model] ?? { calls: 0, inTok: 0, outTok: 0 };
  m.calls += 1;
  m.inTok += entry.inTok;
  m.outTok += entry.outTok;
  prev.byModel[entry.model] = m;
  prev.calls += 1;
  await kv.set(dayKey(date), prev);
  // capped recent log for spot-checks
  await kv.lpush("llmlog", { ...entry, ts: nowMs });
}

export function estimateUsd(byModel: Record<string, ModelAgg>): number {
  let usd = 0;
  for (const [model, m] of Object.entries(byModel)) {
    const p = PRICE[model] ?? { in: 0, out: 0 };
    usd += (m.inTok * p.in + m.outTok * p.out) / 1_000_000;
  }
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export interface CostDay extends DayAgg {
  estUsd: number;
}

// Today + the previous (days-1) days.
export async function costSummary(days = 7, nowMs = Date.now()): Promise<CostDay[]> {
  const kv = await getKV();
  const out: CostDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = isoDate(nowMs - i * 86_400_000);
    const agg = (await kv.get(dayKey(date))) as DayAgg | null;
    if (agg) out.push({ ...agg, estUsd: estimateUsd(agg.byModel) });
  }
  return out;
}
