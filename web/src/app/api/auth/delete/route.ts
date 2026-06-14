import { NextResponse } from "next/server";
import { currentUser, deleteUser, readSessionToken, revokeSession, SESSION_COOKIE, sessionCookieOpts } from "@/lib/server/auth";

export const runtime = "nodejs";

// Delete the account and all its server-side data, then clear the session.
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (user) await deleteUser(user.id);
  await revokeSession(readSessionToken(req));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOpts(0));
  return res;
}
