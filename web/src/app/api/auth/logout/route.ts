import { NextResponse } from "next/server";
import { readSessionToken, revokeSession, SESSION_COOKIE, sessionCookieOpts } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await revokeSession(readSessionToken(req));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOpts(0));
  return res;
}
