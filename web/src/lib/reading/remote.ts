import type { Chart } from "@/lib/astro/chart";
import type { FirstRead } from "./generate";
import type { ThemeRead, ThemeId } from "./theme";
import type { SynRead } from "./synastry";
import type { RelType } from "@/lib/astro/synastry";
import { fallbackFollowups, parseFollowups, type Followup } from "@/lib/ai/followups";
import { useFunnel } from "@/lib/store";

// Gender (for the persona variant) travels with every AI request, read from the
// funnel so callers don't each have to thread it.
const gender = () => useFunnel.getState().gender;

// Real Molly readings via /api/reading (Agent SDK). Opt-in: set
// NEXT_PUBLIC_MOLLY_AI=1 in .env.local. Off by default so tests/CI and a
// fresh checkout run instantly on the deterministic stub. Any failure (no
// auth, timeout, bad shape) returns null → caller falls back to the stub.
export const AI_ON = process.env.NEXT_PUBLIC_MOLLY_AI === "1";

// Generous: the Agent SDK cold-starts an engine subprocess per call (~40-90s
// in dev). Progressive UX shows the stub instantly, so this only governs how
// long we'll wait to upgrade in the background. Production (direct API) is fast.
async function post(body: unknown, ms = 120000): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch("/api/reading", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.paragraphs) ? j : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchFirstRead(chart: Chart, nickname?: string): Promise<FirstRead | null> {
  if (!AI_ON) return null;
  return (await post({ kind: "first", chart, nickname, gender: gender() })) as FirstRead | null;
}

export async function fetchThemeRead(chart: Chart, themeId: ThemeId, nickname?: string): Promise<ThemeRead | null> {
  if (!AI_ON) return null;
  return (await post({ kind: "theme", themeId, chart, nickname, gender: gender() })) as ThemeRead | null;
}

// #5 合盘分型解读. Progressive: callers render the deterministic synScaffold instantly,
// then swap in this LLM prose when it resolves. Returns null when AI is off / times
// out / shape is bad → caller keeps the scaffold (which is already per-type, so the
// fallback is never the dead mad-lib). Perspective: pass the viewer's chart as
// selfChart (the reading is written to "你").
export async function fetchSynastryRead(
  selfChart: Chart,
  otherChart: Chart,
  type: RelType,
  selfName?: string,
  otherName?: string,
): Promise<SynRead | null> {
  if (!AI_ON) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120000);
  try {
    const r = await fetch("/api/synastry/reading", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selfChart, otherChart, type, selfName, otherName, gender: gender() }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.vibe === "string" && typeof j?.body === "string" && typeof j?.catchLine === "string" ? (j as SynRead) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface ChatMsg {
  from: "me" | "molly";
  text: string;
}

export async function fetchChatReply(chart: Chart, messages: ChatMsg[], nickname?: string): Promise<string | null> {
  if (!AI_ON) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120000);
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chart, nickname, messages, gender: gender() }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.text === "string" && j.text ? j.text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// #4 follow-ups. ALWAYS resolves to 3 (deterministic fallback if AI off/fails), so
// chips always appear under a Molly reply. Context-aware when AI is on.
export async function fetchFollowups(chart: Chart, messages: ChatMsg[], tier: 0 | 1 | 2): Promise<Followup[]> {
  if (!AI_ON) return fallbackFollowups(tier);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch("/api/chat/followups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chart, messages, gender: gender(), tier }),
      signal: ctrl.signal,
    });
    if (!r.ok) return fallbackFollowups(tier);
    const j = await r.json();
    const f = parseFollowups(j?.followups);
    return f.length === 3 ? f : fallbackFollowups(tier);
  } catch {
    return fallbackFollowups(tier);
  } finally {
    clearTimeout(t);
  }
}
