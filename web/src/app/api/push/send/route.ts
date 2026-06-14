import { NextResponse } from "next/server";
import { sendToAll, pushConfigured, DAILY_PAYLOAD } from "@/lib/server/push";

export const runtime = "nodejs";

// Daily push fan-out. Triggered by Vercel Cron (GET, Authorization: Bearer
// CRON_SECRET) or manually (?secret=PUSH_CRON_SECRET). Both auth paths optional
// but at least one secret must be configured AND match.
function authorized(req: Request): boolean {
  const url = new URL(req.url);
  const qs = url.searchParams.get("secret");
  const auth = req.headers.get("authorization");
  const pushSecret = process.env.PUSH_CRON_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (pushSecret && qs === pushSecret) return true;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "push not configured" }, { status: 503 });
  const result = await sendToAll(DAILY_PAYLOAD);
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
