import { NextResponse } from "next/server";
import { createInvite, getInvite } from "@/lib/server/synastry-invite";

export const runtime = "nodejs";

// POST → create an invite, returns its token. GET ?token= → invite status
// (whether the partner has filled in their data yet, and the partner chart).
export async function POST(req: Request) {
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
  return NextResponse.json({
    inviterName: invite.inviterName ?? null,
    ready: !!invite.partner,
    partner: invite.partner ?? null,
  });
}
