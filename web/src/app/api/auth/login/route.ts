import { NextResponse } from "next/server";
import { authenticate, createSession, SESSION_COOKIE, sessionCookieOpts } from "@/lib/server/auth";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { bodyTooLarge, KB } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (bodyTooLarge(req, 16 * KB)) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  const rl = await rateLimit(await resolveIdentity(req), RULES.auth()); // M2: throttle brute-force
  if (!rl.ok) return NextResponse.json({ error: "尝试太频繁，请稍后再试" }, { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined });

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
