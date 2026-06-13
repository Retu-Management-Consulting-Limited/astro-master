import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addFeedback, logEvent } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const mid = (await cookies()).get("mid")?.value ?? "anon";
  let body: { text?: string; page?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const text = (body.text ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ ok: false }, { status: 400 });

  await addFeedback({ testerId: mid, text, page: body.page }).catch(() => {});
  await logEvent(mid, "feedback", { page: body.page }).catch(() => {});
  return NextResponse.json({ ok: true });
}
