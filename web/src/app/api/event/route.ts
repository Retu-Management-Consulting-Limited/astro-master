import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logEvent, upsertTester, type TesterPatch } from "@/lib/server/store";

export const runtime = "nodejs";

// Internal-test telemetry. Attributes to the httpOnly `mid` cookie set by
// middleware. Body: { type?, props?, identify? } — fire-and-forget from client.
export async function POST(req: Request) {
  const mid = (await cookies()).get("mid")?.value;
  if (!mid) return NextResponse.json({ ok: false });

  let body: { type?: string; props?: Record<string, unknown>; identify?: TesterPatch };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (body.identify) await upsertTester(mid, body.identify).catch(() => {});
  if (body.type) await logEvent(mid, body.type, body.props).catch(() => {});
  return NextResponse.json({ ok: true });
}
