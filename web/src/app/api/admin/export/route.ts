import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listTesterIds, getTester, getEvents, getFeedback } from "@/lib/server/store";

export const runtime = "nodejs";

// Read all internal-test data. Authorized by the `madm` session cookie (set via
// /api/admin/login) OR ?secret=ADMIN_SECRET (handy for curl).
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  const cookie = (await cookies()).get("madm")?.value;
  const expected = process.env.ADMIN_SECRET;
  const authed = !!expected && (secret === expected || cookie === expected);
  if (!authed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ids = await listTesterIds();
  const testers = await Promise.all(
    ids.map(async (id) => ({ id, profile: await getTester(id), events: await getEvents(id) })),
  );
  const feedback = await getFeedback();
  return NextResponse.json({ count: ids.length, testers, feedback });
}
