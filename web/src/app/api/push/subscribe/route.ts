import { NextResponse } from "next/server";
import { saveSubscription, type PushSubscriptionJSON, type StoredSub } from "@/lib/server/push";
import { resolveIdentity } from "@/lib/server/identity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { subscription?: PushSubscriptionJSON; prefs?: StoredSub["prefs"] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.subscription?.endpoint) return NextResponse.json({ error: "missing subscription" }, { status: 400 });
  const id = await resolveIdentity(req);
  await saveSubscription(body.subscription, id, body.prefs);
  return NextResponse.json({ ok: true });
}
