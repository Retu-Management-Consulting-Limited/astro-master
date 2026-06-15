import { NextResponse } from "next/server";
import {
  createUser,
  createSession,
  EmailTakenError,
  SESSION_COOKIE,
  sessionCookieOpts,
  validateEmail,
  validatePassword,
  type Profile,
} from "@/lib/server/auth";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { bodyTooLarge, KB } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (bodyTooLarge(req, 64 * KB)) return NextResponse.json({ error: "payload too large" }, { status: 413 }); // L4
  const rl = await rateLimit(await resolveIdentity(req), RULES.auth()); // M2
  if (!rl.ok) return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined });

  let body: { email?: string; password?: string; profile?: Profile };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (email.length > 200) return NextResponse.json({ error: "邮箱过长" }, { status: 400 }); // L4
  if (!validateEmail(email)) return NextResponse.json({ error: "邮箱格式不对" }, { status: 400 });
  if (!validatePassword(password)) return NextResponse.json({ error: "密码至少 8 位且包含字母" }, { status: 400 });

  try {
    const user = await createUser(email, password, body.profile);
    const token = await createSession(user.id);
    const res = NextResponse.json({ email: user.email, profile: user.profile ?? null }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOpts());
    return res;
  } catch (e) {
    if (e instanceof EmailTakenError) return NextResponse.json({ error: "这个邮箱已经注册过了" }, { status: 409 });
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
