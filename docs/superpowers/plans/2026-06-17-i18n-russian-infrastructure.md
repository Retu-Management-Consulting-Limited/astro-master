# 俄语版 i18n 基础设施实现计划（子项目 A）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 next-intl 搭好中俄双语前缀路由地基（`/today` 中文默认 + `/ru/today` 俄语），可切换、可持久化，并迁一条 landing+导航竖切验证链路通。

**Architecture:** next-intl 4.13 `as-needed` 前缀路由，`defaultLocale: 'zh'`。`app/` 页面路由下移到 `app/[locale]/`，`app/api/*` 不动。next-intl 中间件**合并进现有 `src/proxy.ts`**（Next 16 把 middleware 改名为 proxy），保留既有 `mid` cookie 逻辑。导航用 next-intl 的 navigation shim 自动加 locale 前缀，硬编码路径不变。

**Tech Stack:** Next.js 16.2.9（魔改版，middleware→proxy）、next-intl 4.13.0、React 19、TypeScript、vitest、playwright、bun。

## Global Constraints

- **Next 16 魔改**：写任何码前先读 `node_modules/next/dist/docs/01-app/...` 对应章节（见 `web/AGENTS.md`）。中间件文件名是 **`proxy.ts`** 不是 `middleware.ts`；params 是异步（`await params`）；用 `PageProps<'/[locale]'>` / `LayoutProps` 全局类型。
- **路由配置定值**：`locales: ['zh','ru']`、`defaultLocale: 'zh'`、`localePrefix: 'as-needed'`。
- **`app/api/*` 路径绝不带 locale 前缀**，proxy matcher 必须排除 `api/`、`_next/*`、`sw.js`、`offline.html`、`icon`、`manifest`、`favicon.ico`。
- **既有 `mid` cookie 逻辑必须保留**（proxy.ts 里给访客发稳定 tester id）。
- **repo 硬规则**：在 worktree `../molly-i18n-ru` + 分支 `feat/i18n-russian` 干活；`main` 只接受 PR；绝不 force-push/reset main；CI 全绿（tsc + vitest + next build + e2e）才合。
- **A 的俄语文案是临时脚手架**：仅 landing + 导航等少量 key，用于证明链路；母语润色 + 宪法 §8 三亮线合规的最终俄语 voice 在子项目 C/D 做。即便临时，也**不得违反 §8**（不编造/操纵）。zh 文案**逐字保留**、不改动。
- **既有 guard 不破**：route-exit / form-scroll / content-freshness / safe-area / contrast / no-mock-content。
- **每次完成宣告必带证据**：`exit=0` + 命令。

---

## 文件结构总览

新建：
- `web/src/i18n/routing.ts` — 路由配置（locales/defaultLocale/localePrefix）单一真相源。
- `web/src/i18n/request.ts` — `getRequestConfig`，按 locale 加载 messages。
- `web/src/i18n/navigation.ts` — `createNavigation(routing)` 导出 locale-aware `Link/useRouter/usePathname/redirect/getPathname`。
- `web/messages/zh.json`、`web/messages/ru.json` — 文案字典（A 只填 landing+nav namespace）。
- `web/src/app/[locale]/layout.tsx` — 带 `<html lang>`、`NextIntlClientProvider`、Cyrillic 字体的本地化根布局。
- `web/src/components/LocaleSwitcher.tsx` — 语言切换器。
- `web/src/__guards__/locale-reachability.test.ts` — 新 guard。
- `web/src/i18n/routing.test.ts`、`web/src/proxy.test.ts` — 单测。

修改：
- `web/next.config.ts` — 挂 `createNextIntlPlugin`。
- `web/src/proxy.ts` — 合并 next-intl 中间件 + 保留 mid cookie。
- `web/src/app/page.tsx` → 移到 `web/src/app/[locale]/page.tsx` + 用 `useTranslations`。
- `web/src/app/layout.tsx` — 拆分（`<html>` 移入 `[locale]/layout.tsx`，按 next-intl 指引处理）。
- `web/src/components/TabBar.tsx` — 标签文案走翻译。
- 其余 ~17 个页面路由目录 — `git mv` 到 `[locale]/`。
- ~20 个 import `next/navigation` 的文件 — 换导航 API 来源为 `@/i18n/navigation`。
- `web/src/app/manifest.ts`、`not-found.tsx`、`error.tsx` — 本地化。

---

## Task 1: next-intl 配置地基 + messages 脚手架

**Files:**
- Create: `web/src/i18n/routing.ts`、`web/src/i18n/request.ts`、`web/src/i18n/navigation.ts`
- Create: `web/messages/zh.json`、`web/messages/ru.json`
- Create: `web/src/i18n/routing.test.ts`
- Modify: `web/next.config.ts`

**Interfaces:**
- Produces: `routing`（`defineRouting` 返回值，供 navigation/request/proxy 复用）；`Link/useRouter/usePathname/redirect/getPathname`（来自 navigation.ts）；messages JSON 结构 `{ common, nav, landing }`。

- [ ] **Step 1: 先读 Next 16 + next-intl 文档**

读 `web/node_modules/next/dist/docs/01-app/02-guides/internationalization.md`（确认 `app/[locale]` 约定 + params 异步）。确认 next-intl 入口：`next-intl/routing`、`next-intl/navigation`、`next-intl/server`、`next-intl/middleware`、`next-intl/plugin`。

- [ ] **Step 2: 写失败测试 `routing.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { routing } from "./routing";

describe("i18n routing", () => {
  it("supports zh + ru with zh default and as-needed prefix", () => {
    expect(routing.locales).toEqual(["zh", "ru"]);
    expect(routing.defaultLocale).toBe("zh");
    expect(routing.localePrefix).toBe("as-needed");
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd web && bun run vitest run src/i18n/routing.test.ts`
Expected: FAIL（`Cannot find module './routing'`）。

- [ ] **Step 4: 写 `routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "ru"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd web && bun run vitest run src/i18n/routing.test.ts`
Expected: PASS。

- [ ] **Step 6: 写 `navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 7: 写 `request.ts`**

```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 8: 建 messages 脚手架**

`web/messages/zh.json`：
```json
{
  "nav": { "ariaLabel": "主导航", "today": "今日", "chart": "本命", "chat": "对话", "me": "我的" }
}
```
`web/messages/ru.json`：
```json
{
  "nav": { "ariaLabel": "Главная навигация", "today": "Сегодня", "chart": "Карта", "chat": "Диалог", "me": "Профиль" }
}
```
（landing key 在 Task 3 补。）

- [ ] **Step 9: 挂 next-intl plugin 到 `next.config.ts`**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 10: tsc 校验 + commit**

Run: `cd web && bun run tsc --noEmit`
Expected: exit=0（注意：此时 `[locale]` 目录还没建，若 next-intl plugin 对缺失结构报错则记下，Task 3 解决；纯 tsc 应过）。

```bash
git add web/src/i18n web/messages web/next.config.ts
git commit -m "feat(i18n): next-intl routing/request/navigation 配置 + messages 脚手架"
```

---

## Task 2: 把 next-intl 中间件合并进 proxy.ts（承重任务）

**Files:**
- Modify: `web/src/proxy.ts`
- Test: `web/src/proxy.test.ts`

**Interfaces:**
- Consumes: `routing`（Task 1）。
- Produces: `proxy(req)` 同时做 locale 路由（next-intl）+ 设 `mid` cookie；`config.matcher` 排除 api/静态。

**背景（务必理解）**：Next 16 用 `proxy.ts` 而非 `middleware.ts`。现有 `proxy()` 给访客发 `mid` httpOnly cookie。next-intl 的 `createMiddleware(routing)` 返回 `(req) => NextResponse`。要把两者**串起来**：先让 next-intl 产出响应（含 locale 重定向/rewrite + `NEXT_LOCALE` cookie），再把 `mid` cookie 合并到那个响应上。

- [ ] **Step 1: 写失败测试 `proxy.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(`https://x.test${path}`), { headers });
}

describe("proxy: next-intl + mid cookie", () => {
  it("sets mid cookie when absent on a page request", () => {
    const res = proxy(req("/today"));
    expect(res.cookies.get("mid")?.value).toBeTruthy();
  });

  it("does not overwrite an existing mid cookie", () => {
    const res = proxy(req("/today", { cookie: "mid=keep-me" }));
    // 已存在则不应再下发新的 mid（Set-Cookie 不含 mid 覆盖）
    expect(res.cookies.get("mid")?.value).toBeUndefined();
  });

  it("redirects ru Accept-Language visitor to /ru on root", () => {
    const res = proxy(req("/", { "accept-language": "ru-RU,ru;q=0.9" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/ru");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd web && bun run vitest run src/proxy.test.ts`
Expected: FAIL（当前 proxy 不处理 locale，ru 不重定向）。

- [ ] **Step 3: 改 `proxy.ts` 合并中间件**

```ts
import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Next 16: this is the `proxy` convention, formerly `middleware`.
// 先跑 next-intl（locale 路由/重定向 + NEXT_LOCALE cookie），再把稳定的
// 访客 tester id（mid）合并到它的响应上。
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd web && bun run vitest run src/proxy.test.ts`
Expected: PASS。若 `intlMiddleware(req)` 在 redirect 分支返回的响应类型不带 `.cookies.set`，改为对返回的 `NextResponse` 直接 `res.cookies.set`（next-intl 返回的就是 `NextResponse`，应支持）。

- [ ] **Step 5: commit**

```bash
git add web/src/proxy.ts web/src/proxy.test.ts
git commit -m "feat(i18n): proxy 合并 next-intl 中间件，保留 mid cookie"
```

---

## Task 3: 竖切样本 — landing + [locale] 布局 + 导航（验证承重假设）

**Files:**
- Create: `web/src/app/[locale]/layout.tsx`
- Move: `web/src/app/page.tsx` → `web/src/app/[locale]/page.tsx`
- Modify: `web/src/app/layout.tsx`（拆分，见下）
- Modify: `web/src/components/TabBar.tsx`
- Modify: `web/messages/zh.json`、`web/messages/ru.json`（补 landing key）
- Test: `web/e2e/i18n-slice.spec.ts`

**Interfaces:**
- Consumes: `routing`、messages（Task 1）、`Link` 仍可用 next-intl 版（Task 5 统一迁，本任务 TabBar 先单独迁）。
- Produces: `app/[locale]/layout.tsx` 提供 `<html lang>` + `NextIntlClientProvider`；`generateStaticParams`。

- [ ] **Step 1: 建 `[locale]/layout.tsx`**

把原 `src/app/layout.tsx` 的 providers/head/body 搬进来，`<html>` 改动态 lang，加 Cyrillic 字体子集：

```tsx
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";
import { StoreHydration } from "@/components/StoreHydration";
import { AuthHydration } from "@/components/AuthHydration";
import { FeedbackButton } from "@/components/FeedbackButton";
import { PageView } from "@/components/PageView";

export const metadata: Metadata = {
  title: "Molly · 看穿你的本命",
  description: "一个不问你星座的占星师。告诉我你出生的那一刻，剩下的交给我。",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Molly" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#04050a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500;1,600&family=Hanken+Grotesk:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&family=Noto+Sans+SC:wght@300;400;500&display=swap&subset=cyrillic,cyrillic-ext,latin"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <StoreHydration />
          <AuthHydration />
          <PageView />
          {children}
          <InstallPrompt />
          <FeedbackButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

注：`LayoutProps<'/[locale]'>` 是 Next 16 全局类型。`&subset=cyrillic,cyrillic-ext,latin` 让 Cormorant/Hanken 拉西里尔字形。

- [ ] **Step 2: 处理根 `app/layout.tsx`**

next-intl `[locale]` 模式下 `<html>` 在 `[locale]/layout.tsx`。按 next-intl 官方指引：删除 `src/app/layout.tsx`，并新建 `src/app/[locale]/not-found.tsx` 兜本地化 404。若 Next 16 要求 `app/` 必须有 root layout，则保留一个**透传** root layout：

```tsx
// src/app/layout.tsx — 透传，真正的 <html> 在 [locale]/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```
读 Next 16 docs 确认哪种被接受；`next build`（Step 6）是判据。

- [ ] **Step 3: 移动 landing 页并接翻译**

`git mv src/app/page.tsx src/app/[locale]/page.tsx`。把硬编码中文换成 `useTranslations("landing")`（landing 是 client 组件，用 `next/link` 的地方本任务先换成 `@/i18n/navigation` 的 `Link`）。补 messages：

`zh.json` 加：
```json
"landing": { "kicker": "不寒暄 · 直接说中", "line1": "别人问你星座，" }
```
`ru.json` 加：
```json
"landing": { "kicker": "Без болтовни · Сразу по сути", "line1": "Другие спрашивают твой знак," }
```
（landing 其余文案逐条照此迁；本竖切至少迁 kicker + line1 + 任意 CTA 文案，证明渲染。）

- [ ] **Step 4: 迁移 TabBar 到翻译 + locale-aware Link**

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
// ...
const TABS = [
  { id: "today", href: "/today" },
  { id: "chart", href: "/chart" },
  { id: "chat", href: "/chat" },
  { id: "me", href: "/me" },
] as const;

export function TabBar({ active }: { active: string }) {
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("ariaLabel")} style={{ /* 原样保留 */ }}>
      {TABS.map((tab) => (
        <Link key={tab.id} href={tab.href} aria-current={active === tab.id ? "page" : undefined} style={{ /* 原样保留 */ }}>
          <TabIcon id={tab.id} />
          {t(tab.id)}
        </Link>
      ))}
    </nav>
  );
}
```
样式逐字保留，只换文案来源和 Link 导入。`TabBar.test.tsx` 若断言中文标签，更新为查 testid 或 mock 翻译。

- [ ] **Step 5: 写竖切 e2e `e2e/i18n-slice.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("zh landing at / renders Chinese + html lang=zh", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByText("不寒暄 · 直接说中")).toBeVisible();
});

test("ru landing at /ru renders Russian + html lang=ru", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByText("Без болтовни · Сразу по сути")).toBeVisible();
});
```

- [ ] **Step 6: 全量验证（承重假设判据）**

Run，逐条要 exit=0：
```bash
cd web
bun run tsc --noEmit
bun run build
bun run vitest run
bun run test:e2e e2e/i18n-slice.spec.ts
```
Expected: 全 PASS。`build` 是 `app/layout.tsx` 取舍的最终判据。**若任一红 → 在此停，先调通竖切再继续 Task 4，绝不带病铺开。**

- [ ] **Step 7: Cyrillic 字体目视验证**

启动 `bun run dev`，浏览器开 `/ru`，确认俄语字符正常渲染（非豆腐块/方框）。截图存证。

- [ ] **Step 8: commit**

```bash
git add -A
git commit -m "feat(i18n): landing+TabBar 竖切迁移，[locale] 布局 + Cyrillic 字体，验证链路"
```

---

## Task 4: 批量下移其余页面路由到 [locale]/

**Files:**
- Move: `web/src/app/{reading,wealth,synastry,chat,today,input,calibration,chart,body,admin,register,theme,me,money,history,share}` → `web/src/app/[locale]/`（保留 `api`、`error.tsx`、`manifest.ts` 在原位/按需处理；`not-found.tsx` 见 Task 3/7）。

**Interfaces:**
- Consumes: `[locale]/layout.tsx`（Task 3）。
- Produces: 全部页面路由在 `[locale]` 段下；zh 仍服务于 `/today`（as-needed），ru 在 `/ru/today`。

- [ ] **Step 1: 逐目录 git mv**

```bash
cd web/src/app
for d in reading wealth synastry chat today input calibration chart body admin register theme me money history share; do
  git mv "$d" "[locale]/$d"
done
```
（`error.tsx` 是全局错误边界，留 `app/` 根；如需本地化在 Task 7 处理。）

- [ ] **Step 2: 修内部相对 import（若有）**

页面里若用相对路径 import（如 `../../components`），下移一层后会断。统一确认都走 `@/` alias（tsconfig paths）。Run: `cd web && bun run tsc --noEmit`，按报错逐个修为 `@/` 绝对导入。

- [ ] **Step 3: 全量验证**

Run，逐条 exit=0：
```bash
cd web
bun run tsc --noEmit
bun run build
bun run vitest run
bun run test:e2e
```
Expected: 全 PASS。**既有 zh e2e 路径（`/today` 等）应直接通过**（as-needed 不改 zh URL）。若个别 e2e 断言 `<html lang>` 之类，更新断言。

- [ ] **Step 4: commit**

```bash
git add -A
git commit -m "feat(i18n): 批量下移 17 个页面路由到 [locale]/"
```

---

## Task 5: 导航 API 迁移（next/navigation → @/i18n/navigation）

**Files:**
- Modify: ~20 个 import `next/navigation` 的文件（含已迁的 TabBar/landing 跳过）。
- 审计: 7 处 `window.location` + 12 处 `<a href>`。

**Interfaces:**
- Consumes: `Link/useRouter/usePathname/redirect`（来自 `@/i18n/navigation`，Task 1）。
- Produces: 所有内部跳转 locale-aware（在 `/ru/*` 下 push 自动留在 ru）。

**规则**：只把**导航 API**（`Link`、`useRouter`、`usePathname`、`redirect`、`permanentRedirect`）的来源从 `next/navigation` 换成 `@/i18n/navigation`。**非导航 API**（`useSearchParams`、`useParams`、`notFound`）仍来自 `next/navigation`。硬编码路径（`/wealth` 等）**不改**。

- [ ] **Step 1: 列出待迁文件**

Run: `cd web && grep -rln 'from "next/navigation"' src --include=*.tsx --include=*.ts`
对每个文件，拆分 import：导航 API 来自 `@/i18n/navigation`，其余留 `next/navigation`。

- [ ] **Step 2: 逐文件迁移（示例）**

before:
```ts
import { useRouter, useSearchParams } from "next/navigation";
```
after:
```ts
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
```
`<a href="/...">` 内部链接换成 `<Link href="/...">`（来自 `@/i18n/navigation`）；`window.location.href = "/x"` 内部跳转换成 `useRouter().push("/x")`，外链/整页刷新场景保留并加注释。

- [ ] **Step 3: 写 locale 保持 e2e（加到 i18n-slice.spec.ts）**

```ts
test("navigation preserves ru locale", async ({ page }) => {
  await page.goto("/ru/today");
  // 触发一个站内跳转（按业务实际可点元素，如 money 入口）
  await page.getByTestId("money-entry").click();
  await expect(page).toHaveURL(/\/ru\/money/);
});
```
（若 `/ru/today` 需登录态，用既有 e2e 的登录 helper 先建态。）

- [ ] **Step 4: 全量验证**

Run，逐条 exit=0：
```bash
cd web
bun run tsc --noEmit
bun run build
bun run vitest run
bun run test:e2e
```
Expected: 全 PASS。

- [ ] **Step 5: commit**

```bash
git add -A
git commit -m "feat(i18n): 导航 API 迁移到 locale-aware shim，跳转保持 locale"
```

---

## Task 6: LocaleSwitcher 组件

**Files:**
- Create: `web/src/components/LocaleSwitcher.tsx`
- Modify: `web/src/app/[locale]/me/settings/page.tsx`（放入切换器）、landing（可选入口）
- Modify: `web/messages/{zh,ru}.json`（加 `common.language` 等 key）

**Interfaces:**
- Consumes: `useRouter`、`usePathname`（`@/i18n/navigation`）、`useLocale`（`next-intl`）。
- Produces: `<LocaleSwitcher />`，切换时停在当前页对应 locale。

- [ ] **Step 1: 写组件**

```tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { zh: "中文", ru: "Русский" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span>{t("language")}</span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        style={{ /* 跟随设置页既有控件样式 */ }}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>{LABELS[l]}</option>
        ))}
      </select>
    </label>
  );
}
```
messages 加：`zh.common.language = "语言"`，`ru.common.language = "Язык"`。

- [ ] **Step 2: 放进设置页**

在 `[locale]/me/settings/page.tsx` 合适分区插入 `<LocaleSwitcher />`（import from `@/components/LocaleSwitcher`）。

- [ ] **Step 3: 写切换 e2e（加到 i18n-slice.spec.ts）**

```ts
test("switcher keeps you on same page across locales", async ({ page }) => {
  await page.goto("/ru/me/settings");
  await page.locator("select").selectOption("zh");
  await expect(page).toHaveURL(/\/me\/settings$/); // zh 无前缀
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
});
```

- [ ] **Step 4: 全量验证 + commit**

Run（逐条 exit=0）：`cd web && bun run tsc --noEmit && bun run build && bun run vitest run && bun run test:e2e`
```bash
git add -A
git commit -m "feat(i18n): LocaleSwitcher 组件 + 设置页接入"
```

---

## Task 7: 本地化 manifest / not-found / error / metadata

**Files:**
- Modify: `web/src/app/manifest.ts`、`web/src/app/[locale]/layout.tsx`（`generateMetadata`）
- Create/Modify: `web/src/app/[locale]/not-found.tsx`、`web/src/app/[locale]/error.tsx`（或保留根 error）
- Modify: `web/messages/{zh,ru}.json`（加 `meta`、`notFound`、`error` namespace）

**Interfaces:**
- Consumes: `getTranslations`（`next-intl/server`）。
- Produces: title/description/404/错误页按 locale 出。

- [ ] **Step 1: metadata 改 generateMetadata**

把 `[locale]/layout.tsx` 的静态 `metadata` 换成：
```ts
import { getTranslations } from "next-intl/server";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Molly" },
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
  };
}
```
messages 加 `meta.title`/`meta.description`：zh 用原中文逐字；ru 给临时俄译。

- [ ] **Step 2: 本地化 not-found / error 文案**

`[locale]/not-found.tsx` 用 `useTranslations("notFound")`；`error.tsx`（client）用 `useTranslations("error")`。messages 补对应 key（zh 保留原文案，ru 临时译）。

- [ ] **Step 3: manifest 本地化（name/short_name/description）**

`manifest.ts` 若含中文 name/description，至少保证默认（zh）不变；俄语 manifest 的完整方案归 D，本任务只确保 build 不破、默认正确。

- [ ] **Step 4: 全量验证 + commit**

Run（逐条 exit=0）：`cd web && bun run tsc --noEmit && bun run build && bun run vitest run && bun run test:e2e`
```bash
git add -A
git commit -m "feat(i18n): metadata/not-found/error 本地化"
```

---

## Task 8: locale-reachability guard + 全量 gate + 字体终验

**Files:**
- Create: `web/src/__guards__/locale-reachability.test.ts`

**Interfaces:**
- Consumes: `routing`。
- Produces: 机器强制 guard——每个页面路由在 zh/ru 都可达。

- [ ] **Step 1: 写 guard 测试**

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { routing } from "../i18n/routing";

// 确保所有页面路由都在 [locale] 段下（防止有人新增页面忘了放进 [locale]）
describe("locale reachability", () => {
  it("all page routes live under app/[locale]", () => {
    const appDir = join(process.cwd(), "src/app");
    const top = readdirSync(appDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    // app/ 顶层只允许 [locale] 和 api（外加无目录的根文件）
    const allowed = new Set(["[locale]", "api"]);
    const stray = top.filter((d) => !allowed.has(d));
    expect(stray).toEqual([]);
  });

  it("routing exposes both locales", () => {
    expect(routing.locales).toContain("zh");
    expect(routing.locales).toContain("ru");
  });
});
```

- [ ] **Step 2: 跑 guard**

Run: `cd web && bun run vitest run src/__guards__/locale-reachability.test.ts`
Expected: PASS。

- [ ] **Step 3: 全量 gate（A 完成判据，逐条 exit=0）**

```bash
cd web
bun run tsc --noEmit
bun run vitest run
bun run build
bun run test:e2e
```
Expected: 全 PASS。任一红则回到对应 Task 修复。

- [ ] **Step 4: Cyrillic 字体终验**

`bun run dev` → 浏览器 `/ru`、`/ru/today`、`/ru/me/settings`，确认俄语全程正常渲染、无豆腐块、布局不溢出。截图存 `docs/` 或贴 PR。

- [ ] **Step 5: commit + 开 PR**

```bash
git add -A
git commit -m "feat(i18n): locale-reachability guard + 全量 gate 通过"
git push -u origin feat/i18n-russian
gh pr create --title "feat(i18n): 俄语版 i18n 基础设施（子项目 A）" --body "$(cat <<'EOF'
子项目 A：next-intl 中俄双语前缀路由地基（as-needed，zh 默认）。

- next-intl 配置 + proxy 合并中间件（保留 mid cookie）
- app/[locale] 重构 + Cyrillic 字体
- 导航 locale-aware + LocaleSwitcher
- metadata/404/error 本地化 + locale-reachability guard

zh URL 不变；ru 在 /ru/*。UI 文案批量抽取(B)、Molly 俄语解读(C)、市场横切(D) 后续子项目。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
PR 后由主循环盯 CI（required checks 全绿）→ 自动合 main。

---

## 验收对照（Definition of Done for A）

- [ ] `/` 出中文、`/ru` 出俄语，`<html lang>` 正确。
- [ ] 站内跳转保持 locale；LocaleSwitcher 切换停在同一页。
- [ ] `tsc` + `vitest run` + `next build` + 全量 `test:e2e` 全绿（带 exit=0 证据）。
- [ ] 既有 guard（route-exit/form-scroll/content-freshness/safe-area/contrast）不破 + 新 locale-reachability guard 绿。
- [ ] 西里尔字符真机/截图验证通过。
- [ ] `mid` cookie 行为保留（proxy 测试证明）。
- [ ] PR 开出、CI 全绿。
