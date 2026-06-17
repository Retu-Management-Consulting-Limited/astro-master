import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Next 16: this is the `proxy` convention, formerly `middleware`.
// 先跑 next-intl（locale 路由/重定向 + NEXT_LOCALE cookie），再把稳定的
// 访客 tester id（mid，httpOnly）合并到它的响应上。服务端路由读 mid
// 归因 telemetry/feedback——客户端从不需要看到它。
export function proxy(req: NextRequest) {
  const res = intlMiddleware(req);
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
