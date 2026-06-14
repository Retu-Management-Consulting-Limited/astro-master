import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  return NextResponse.json({ email: user.email, profile: user.profile ?? null });
}
