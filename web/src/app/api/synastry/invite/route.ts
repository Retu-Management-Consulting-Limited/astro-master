import { NextResponse } from "next/server";
import { createInvite, getInvite } from "@/lib/server/synastry-invite";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

// POST → create an invite, returns its token. GET ?token= → invite status
// (whether the partner has filled in their data yet, and the partner chart).
export async function POST(req: Request) {
  const rl = await rateLimit(await resolveIdentity(req), RULES.invite()); // M5: cap invite creation
  if (!rl.ok) return NextResponse.json({ error: "创建太频繁，请稍后再试" }, { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined });

  let inviterName: string | undefined;
  try {
    inviterName = (await req.json())?.inviterName;
  } catch {
    /* optional body */
  }
  const token = await createInvite(typeof inviterName === "string" ? inviterName : undefined);
  return NextResponse.json({ token });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const invite = await getInvite(token);
  if (!invite) return NextResponse.json({ error: "invite not found" }, { status: 404 });
  // M4: only expose what the inviter's page actually uses (chart + name). The
  // partner's raw birthForm (date/time/country/city PII) must NOT be returned —
  // anyone holding/forwarded the link could otherwise read it unauthenticated.
  const partner = invite.partner ? { name: invite.partner.name ?? null, chart: invite.partner.chart } : null;
  return NextResponse.json({
    inviterName: invite.inviterName ?? null,
    ready: !!invite.partner,
    partner,
  });
}
