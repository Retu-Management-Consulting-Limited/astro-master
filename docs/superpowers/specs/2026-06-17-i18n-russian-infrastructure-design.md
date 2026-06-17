# 俄语版 i18n 基础设施设计（子项目 A）

**日期**：2026-06-17
**分支**：`feat/i18n-russian`
**状态**：设计已确认，待 writing-plans

## 背景与全局分解

Molly（星盘大师）当前为纯中文硬编码 app（151 个源文件含中文），`next-intl` 已在依赖中但**零接入**（src 无任何引用，无 messages/locale 文件）。

目标是做**中俄双语、可切换、真要面向俄语市场上线**的版本，**全层**覆盖：UI 静态文案 + Molly 的 LLM 解读内容都用俄语。

整件事分解为四个子项目（依赖：A 是地基，B/C 并行依赖 A，D 横切）：

- **A. i18n 基础设施**（本 spec）—— next-intl 前缀路由接线、locale 路由/切换/持久化、字体 Cyrillic 覆盖。
- **B. UI 静态文案抽取 + 俄译** —— 把 151 文件硬编码中文抽进 `messages/zh.json`，建 `messages/ru.json`。体量最大、可高度并行。
- **C. Molly 用俄语解读** —— LLM 内容层；prompt 加语言参数 + 宪法 eval rubric 出俄语版校验。最难、最高风险（碰宪法 gate）。
- **D. 俄语市场横切适配** —— 占星术语俄译标准、日期/数字格式、share-card/push/PWA locale、母语者润色。

**排期**：A → B/C 并行 → D 收尾。每子项目独立走 spec → plan → 实现 → PR。

本 spec 只覆盖 **A**。

## A 的目标

搭好 next-intl 前缀路由地基，让 `/today`（中文，默认）和 `/ru/today`（俄语）都能跑、能切换、能持久化。A 只搭架构 + 迁一条"竖切样本"（landing + 底部导航）证明链路通；151 文件的批量抽取留给 B。

## 核心架构决策（已确认）

- **路由模式**：前缀路由，`localePrefix: 'as-needed'`，`defaultLocale: 'zh'`。
  - 中文（默认）URL 完全不变：`/today` 仍是 `/today`，保住现有 SEO/书签。
  - 俄语带前缀：`/ru/today`。
  - **重要副作用（降风险）**：现有 e2e 的硬编码 `/today` 等路径对 zh 依然有效，无需改。

## 设计

### 1. 路由层（核心重构）

- 新建 `src/i18n/routing.ts`：`defineRouting({ locales: ['zh','ru'], defaultLocale: 'zh', localePrefix: 'as-needed' })`。
- **`app/` 重构成 `app/[locale]/`**：所有非-api 页面路由（today/chat/wealth/synastry/chart/body/calibration/input/register/theme/me/money/history/reading/share/admin 等 ~18 个）下移一层到 `[locale]/`。
- **`app/api/*` 不动**：API 路径不带 locale 前缀，保持现状。
- 新建 `src/middleware.ts`：next-intl 中间件做 locale 检测/重定向；matcher **必须排除** `/api`、`/_next`、静态资源、`manifest`、`sw.js` 等。
- `src/i18n/request.ts`：`getRequestConfig` 按 locale 加载对应 messages。

### 2. 导航层（横扫 ~20 文件）

- 新建 `src/i18n/navigation.ts`：用 next-intl `createNavigation(routing)` 导出 locale-aware 的 `Link / useRouter / usePathname / redirect / getPathname`。
- 把 20 个文件里 `from "next/navigation"` 的 **导航 API** 换成 `@/i18n/navigation`（`useSearchParams`、`useParams` 等非导航 API 仍来自 `next/navigation`）。
- **硬编码路径（`/wealth`、`/money`、`/register` 等）不用改**——shim 自动按当前 locale 加前缀。
- 审计 7 处 `window.location` + 12 处 `<a href>`：内部跳转的改成 locale-aware；外链/特殊场景保留并标注。

### 3. Layout / 字体 / 元数据

- 根 layout 拆成 `src/app/[locale]/layout.tsx`：
  - 包 `NextIntlClientProvider`（传 messages）。
  - 调 `setRequestLocale(locale)` 支持静态渲染。
  - `<html lang={locale}>` 动态化（zh / ru）。
  - 校验 locale 合法，非法走 `notFound()`。
  - `generateStaticParams` 返回两个 locale。
- **字体加 Cyrillic 覆盖**：Cormorant Garamond + Hanken Grotesk 加 `&subset=cyrillic`（两者均支持西里尔）；CJK 字体（Noto Serif/Sans SC）对俄文无效，俄文走 Cyrillic + fallback 字体栈。**需真机/截图验证西里尔字符真渲染、不豆腐块。**
- `manifest.ts`、`not-found.tsx`、`error.tsx`、`metadata`（title/description）按 locale 出。

### 4. messages 脚手架 + 切换器

- 建 `messages/zh.json` + `messages/ru.json`，定 namespace 结构（如 `common` / `nav` / `landing`）。
- A 只迁 **landing + 底部 tab 导航** 这条竖切（证明 zh/ru 都能渲染、切换、URL 正确），其余文案 key 留给 B 批量抽取。
- `LocaleSwitcher` 组件：先放设置页 + landing；切换时停在当前页对应 locale（用 `usePathname` + `router.replace({locale})`）。
- locale 持久化：next-intl 默认走 `NEXT_LOCALE` cookie，由 middleware 维护。

### 5. 验收 Gate（A 完成判据）

每项必须出证据（命令 + exit=0）：

- `tsc --noEmit` 绿。
- `vitest run` 全绿（含既有 guard）。
- `next build` 绿。
- **现有 playwright e2e 全绿**——zh 路径不变应直接通过；若有断言依赖 `<html lang>` 等需同步。
- 新 guard（登记到 `src/__guards__/`）：每个路由在 zh 和 ru 都可达；切换语言时停在同一逻辑页。
- 既有 guard（route-exit / form-scroll / content-freshness / safe-area / contrast）不破。
- 西里尔字体渲染：截图或真机验证俄语字符正常显示。

## ⚠️ 承重假设（错了就全垮，必须先验）

Next **16.2.9**（魔改版，见 `web/AGENTS.md`：API/约定/文件结构可能与训练数据不同）+ next-intl 4.13 的 `as-needed` 前缀路由，在本 app 结构下真能跑通。

**降风险做法（强制顺序）**：
1. 先读 `node_modules/next/dist/docs/` 里 i18n / middleware / app-router 相关章节，确认本版本 API。
2. 先迁一条最薄竖切（landing 单页 + middleware + routing 配置）跑通 `/` 和 `/ru`，验证 build + 一条 e2e。
3. 验证通过再铺开 18 个页面的下移和 20 文件的导航迁移——**不一上来就动全部**。

## 不在 A 范围（YAGNI）

- 151 文件的 UI 文案批量抽取 → B。
- Molly LLM 输出俄语化、prompt 语言参数、宪法俄语 eval → C。
- 占星术语俄译标准、日期/数字本地化格式、share-card/push 俄语、母语润色 → D。
- 第三语言（英文等）—— 架构预留可扩展，但本期不实现。

## 并行协作约束（repo 硬规则）

- 在 worktree `../molly-i18n-ru` + 分支 `feat/i18n-russian` 上干活，不共用工作目录。
- `main` 只接受 PR；绝不对 main force-push / reset。
- CI 全绿（tsc + vitest + next build + e2e required checks）才合。
