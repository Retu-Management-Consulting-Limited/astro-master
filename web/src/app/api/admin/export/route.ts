import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listTesterIds, getTester, getEvents, getFeedback } from "@/lib/server/store";
import { costSummary } from "@/lib/server/cost";

export const runtime = "nodejs";

// Read all internal-test data. Authorized by the `madm` session cookie (set via
// /api/admin/login) OR ?secret=ADMIN_SECRET (handy for curl).
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  const cookie = (await cookies()).get("madm")?.value;
  const expected = process.env.ADMIN_SECRET;
  const authed = !!expected && (secret === expected || cookie === expected);
  // R12/P2-7: missing-or-invalid credential is an authentication failure → 401,
  // consistent with /api/admin/login (was 403).
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ids = await listTesterIds();
  const testers = await Promise.all(
    ids.map(async (id) => ({ id, profile: await getTester(id), events: await getEvents(id) })),
  );
  const feedback = await getFeedback();
  const cost = await costSummary(7); // today + last 6 days: calls/tokens/by-model/est USD
  return NextResponse.json({ count: ids.length, testers, feedback, cost });
}
