import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await currentUser(req);
  // R12 / P2-2: this is a public identity probe — an anonymous caller is an
  // expected state, not an error. Returning 401 made every guest page log a
  // console error. Return 200 with an explicit flag instead.
  if (!user) return NextResponse.json({ authenticated: false, user: null });
  return NextResponse.json({ authenticated: true, email: user.email, profile: user.profile ?? null });
}
