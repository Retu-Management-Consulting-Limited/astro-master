import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { ruEnabled } from "@/i18n/exposure";

const intlMiddleware = createMiddleware(routing);

// Next 16: this is the `proxy` convention, formerly `middleware`.
//
// (1) RU_PUBLIC gate — 承接 Kevin「俄语暂不对用户开」决策。flag 关时，任何
//     带 /ru 前缀的访问被重定向回默认 locale（剥前缀），俄语全建好但不暴露。
//     仅在「flag 关 且 路径带 /ru 前缀」时介入；其余路由（as-needed、mid
//     cookie、locale 检测）原样走 next-intl，不破 A 的竖切。
// (2) 跑 next-intl（locale 路由/重定向 + NEXT_LOCALE cookie），再把稳定的
//     访客 tester id（mid，httpOnly）合并到它的响应上。服务端路由读 mid
//     归因 telemetry/feedback——客户端从不需要看到它。
export function proxy(req: NextRequest) {
  // (1) RU_PUBLIC 闸：flag 关时把 /ru、/ru/... 剥成默认 locale 路径并重定向。
  if (!ruEnabled()) {
    const { pathname } = req.nextUrl;
    if (pathname === "/ru" || pathname.startsWith("/ru/")) {
      const stripped = pathname.slice("/ru".length) || "/";
      const url = new URL(stripped, req.url);
      url.search = req.nextUrl.search;
      return NextResponse.redirect(url);
    }
  }

  // (2) next-intl + mid cookie。
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
