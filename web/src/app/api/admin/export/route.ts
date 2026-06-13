import { NextResponse } from "next/server";
import { listTesterIds, getTester, getEvents, getFeedback } from "@/lib/server/store";

export const runtime = "nodejs";

// Read all internal-test data. Guarded by ADMIN_SECRET — GET /api/admin/export?secret=...
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ids = await listTesterIds();
  const testers = await Promise.all(
    ids.map(async (id) => ({ id, profile: await getTester(id), events: await getEvents(id) })),
  );
  const feedback = await getFeedback();
  return NextResponse.json({ count: ids.length, testers, feedback });
}
