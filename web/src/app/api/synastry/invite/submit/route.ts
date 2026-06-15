import { NextResponse } from "next/server";
import { setPartner } from "@/lib/server/synastry-invite";
import { isFullChart } from "@/lib/astro/chart-validate";
import { bodyTooLarge, KB } from "@/lib/server/http";

export const runtime = "nodejs";

// Person B submits their real chart (computed client-side) against the invite.
export async function POST(req: Request) {
  if (bodyTooLarge(req, 64 * KB)) return NextResponse.json({ error: "payload too large" }, { status: 413 }); // M5
  let body: { token?: string; name?: string; chart?: unknown; birthForm?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ error: "missing token" }, { status: 400 });
  // Validate the chart structurally (M3/M7): an empty/`{}`/string/array chart
  // would otherwise persist and crash the inviter's /synastry page on
  // `.placements.find(...).lon`. Reject at the boundary.
  if (!isFullChart(body.chart)) return NextResponse.json({ error: "invalid chart" }, { status: 400 });

  const result = await setPartner(body.token, { name: body.name, chart: body.chart, birthForm: body.birthForm });
  if (result === "unknown") return NextResponse.json({ error: "invite not found" }, { status: 404 });
  if (result === "already") return NextResponse.json({ error: "already submitted" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
