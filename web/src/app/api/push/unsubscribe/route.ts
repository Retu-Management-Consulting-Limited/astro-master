import { NextResponse } from "next/server";
import { removeSubscription } from "@/lib/server/push";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let endpoint = "";
  try {
    endpoint = (await req.json())?.endpoint ?? "";
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
