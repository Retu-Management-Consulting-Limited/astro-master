import { NextResponse } from "next/server";
import { currentUser, saveProfile, type Profile } from "@/lib/server/auth";

export const runtime = "nodejs";

// Persist the latest funnel snapshot to the logged-in user's account.
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  let profile: Profile;
  try {
    profile = (await req.json())?.profile ?? {};
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  await saveProfile(user.id, profile);
  return NextResponse.json({ ok: true });
}
