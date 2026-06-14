import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Admin login → sets an httpOnly session cookie so the dashboard doesn't need
// the secret re-pasted each visit. Accepts ADMIN_PASSWORD (short, memorable, if
// set) OR ADMIN_SECRET (the long guard token).
export async function POST(req: Request) {
  let password = "";
  try {
    password = (await req.json())?.password ?? "";
  } catch {
    /* ignore */
  }
  const ok =
    (!!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) ||
    (!!process.env.ADMIN_SECRET && password === process.env.ADMIN_SECRET);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("madm", process.env.ADMIN_SECRET ?? "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
