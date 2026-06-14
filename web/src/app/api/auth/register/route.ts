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

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; profile?: Profile };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
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
