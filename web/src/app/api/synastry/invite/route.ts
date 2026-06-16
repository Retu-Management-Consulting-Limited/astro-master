import { NextResponse } from "next/server";
import { createInvite, getInvite } from "@/lib/server/synastry-invite";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { isFullChart } from "@/lib/astro/chart-validate";
import type { RelType } from "@/lib/astro/synastry";

export const runtime = "nodejs";

const REL_TYPES: RelType[] = ["lover", "partner", "colleague", "friend", "family"];

// POST → create an invite, returns its token. GET ?token= → invite status
// (whether the partner has filled in their data yet, and the partner chart).
export async function POST(req: Request) {
  const rl = await rateLimit(await resolveIdentity(req), RULES.invite()); // M5: cap invite creation
  if (!rl.ok) return NextResponse.json({ error: "创建太频繁，请稍后再试" }, { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined });

  let body: { inviterName?: unknown; inviterChart?: unknown; type?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* optional body */
  }
  // inviterChart/type are optional (A-side sends them once D3 lands). If a chart
  // IS provided it must be structurally valid — a junk chart would crash B-5.
  if (body.inviterChart !== undefined && !isFullChart(body.inviterChart)) {
    return NextResponse.json({ error: "invalid chart" }, { status: 400 });
  }
  const type = REL_TYPES.includes(body.type as RelType) ? (body.type as RelType) : undefined;
  const token = await createInvite(
    typeof body.inviterName === "string" ? body.inviterName : undefined,
    body.inviterChart,
    type,
  );
  return NextResponse.json({ token });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const invite = await getInvite(token);
  if (!invite) return NextResponse.json({ error: "invite not found" }, { status: 404 });
  // §9.3 / M4: expose only DERIVED charts (placements), never raw birthForm — for
  // either side. partner.chart and inviterChart are derived; birthForm stays server-only.
  const partner = invite.partner ? { name: invite.partner.name ?? null, chart: invite.partner.chart } : null;
  return NextResponse.json({
    inviterName: invite.inviterName ?? null,
    inviterChart: invite.inviterChart ?? null,
    type: invite.type ?? null,
    ready: !!invite.partner,
    partner,
  });
}
