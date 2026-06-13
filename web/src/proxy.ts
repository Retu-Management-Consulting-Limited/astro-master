import { NextResponse, type NextRequest } from "next/server";

// Assigns each visitor a stable tester id (httpOnly cookie). Server routes read
// it to attribute telemetry/feedback — the client never needs to see it.
// (Next 16: this is the `proxy` convention, formerly `middleware`.)
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("mid")?.value) {
    res.cookies.set("mid", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  // pages only — skip static assets, API, and PWA/icon files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|sw.js|offline.html|icon|manifest).*)"],
};
