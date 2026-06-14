import { NextResponse } from "next/server";
import { setPartner } from "@/lib/server/synastry-invite";

export const runtime = "nodejs";

// Person B submits their real chart (computed client-side) against the invite.
export async function POST(req: Request) {
  let body: { token?: string; name?: string; chart?: unknown; birthForm?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.token || !body.chart) return NextResponse.json({ error: "missing token or chart" }, { status: 400 });

  const result = await setPartner(body.token, { name: body.name, chart: body.chart, birthForm: body.birthForm });
  if (result === "unknown") return NextResponse.json({ error: "invite not found" }, { status: 404 });
  if (result === "already") return NextResponse.json({ error: "already submitted" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
