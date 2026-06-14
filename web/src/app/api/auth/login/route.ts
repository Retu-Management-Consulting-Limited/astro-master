import { NextResponse } from "next/server";
import { authenticate, createSession, SESSION_COOKIE, sessionCookieOpts } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const user = await authenticate((body.email ?? "").trim(), body.password ?? "");
  if (!user) return NextResponse.json({ error: "邮箱或密码不对" }, { status: 401 });

  const token = await createSession(user.id);
  const res = NextResponse.json({ email: user.email, profile: user.profile ?? null });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOpts());
  return res;
}
