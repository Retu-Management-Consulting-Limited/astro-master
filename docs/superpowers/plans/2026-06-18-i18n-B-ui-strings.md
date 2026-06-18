# 子项目 B：UI 静态文案抽取 + 俄译 — 设计 + 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。每任务严格 TDD（失败测试→实现→绿→commit）。Steps 用 `- [ ]`。

**Goal:** 把全部 UI 静态中文（按钮/标签/表单/aria/placeholder/空态/错误态，~665 处、~41 文件）抽进 next-intl messages 并俄译，使语言切换后界面 chrome 中俄完整、无混排。

**Architecture:** 在 A 的 next-intl 基础上，把 messages 从单文件 `messages/{zh,ru}.json` 重构成**按 namespace 分文件**（`messages/{zh,ru}/<ns>.json`），request.ts 合并加载。这样各提取任务**各占一个 namespace 文件 + 各占一组 .tsx**，文件层互不相交 → 真并行、无 JSON 写冲突。

**Tech Stack:** Next 16.2.9（魔改：proxy 非 middleware、params 异步、PageProps/LayoutProps 全局类型）、next-intl 4.13、React 19、TS、vitest、playwright、bun。

## Global Constraints

- **范围**：只动 UI chrome。`src/lib/ai/*`、`src/lib/reading/*`、`src/app/api/*` 里的 prompt 与确定性 Molly 内容表（theme/daily/todayVerdict/bodyVerdict/openers 等）**属子项目 C，B 绝不碰**。
- **zh 文案逐字保留**（抽进 messages 时原样搬，不改字）。
- **ru 译文**：Claude 译，引用共享占星术语表保持一致；母语润色留 D。译文不得编造/夸大（宪法 §8 底线，即便是 UI 文案）。
- **保留 A 既有**：routing/navigation/proxy 不动；A 已建的 namespace（common/nav/landing/meta/notFound/error）平迁进新结构、键值不变。
- **既有 guard 不破**：route-exit/form-scroll/content-freshness/safe-area/contrast/locale-reachability。
- **repo 硬规则**：worktree `../molly-i18n-ui` + 分支 `feat/i18n-ui-strings`；main 只 PR；CI 全绿（tsc+vitest+build+e2e + 新增 i18n guard）才合。
- 完成宣告必带 `exit=0` 证据。

## ⚠️ 承重风险（错了就垮）

1. **漏串致中俄混排**——切到 ru 后界面仍冒中文。→ 硬化 guard：CI 拦 `.tsx`/`.ts`（非 C 区、非注释）残留 CJK。
2. **属性类文案漏抽**（aria-label/title/alt/placeholder）。→ guard 的 grep 覆盖属性。
3. **插值/复数译错**——俄语三态复数（1 / 2-4 / 5+）。→ 计数文案用 ICU plural；guard 检查 zh/ru key 路径完全对齐。
4. **改坏 zh**——抽取时手滑改原文。→ 抽样截图对照 + e2e 中文断言不变。

---

## Task 1（serial · 地基）: messages 重构为 per-namespace + 术语表 + 硬化 guard

**Files:**
- 重构: `web/messages/zh.json` → `web/messages/zh/{common,nav,landing,meta,notFound,error}.json`（ru 同）
- Modify: `web/src/i18n/request.ts`（合并加载所有 namespace 文件）
- Create: `web/src/i18n/glossary.ts`（占星/产品术语 zh↔ru 共享表，~90-100 词，供并行任务引用）
- Create: `web/src/__guards__/no-cjk-in-ui.test.ts`、`web/src/__guards__/message-key-parity.test.ts`
- Create: `web/scripts/check-i18n.mjs`（CI 用）；Modify: `web/package.json`（prebuild 挂 check）、`.github/workflows/ci.yml`

**AC:**
- request.ts 合并加载 per-ns 文件后，A 的 landing/nav 竖切仍渲染（zh `/` + ru `/ru`）。
- `no-cjk-in-ui` guard：扫 `src/app`+`src/components` 的 `.tsx`（排除注释、排除 C 区路径），**断言无 CJK**；当前应**预期失败**（还没抽），故本任务先把 guard 写成「允许清单递减」模式或标 `.skip` 留到 Task N 收口启用 —— **实现方式**：guard 接受一个「已清理文件」清单，Task 1 清单含已 i18n 的 landing/TabBar，后续任务往清单加；Task N 时清单=全部、删清单参数变全量断言。
- `message-key-parity` guard：`messages/zh/**` 与 `messages/ru/**` 的 key 路径集合完全相等（diff 空）。
- glossary.ts 导出 `PLANETS/SIGNS/HOUSES/ASPECTS/TERMS`（zh+ru），含侦察列出的 ~90 词。
- Gate: `cd web && bun run tsc --noEmit && bun run build && bun run vitest run && bun run test:e2e e2e/i18n-slice.spec.ts` 全 exit=0。

**Steps（TDD）:** 先写 parity guard 失败测试→实现合并 loader→绿；写 glossary；写 no-cjk guard（清单模式）；挂 CI script；commit。

---

## Task 2–9（parallel · 各占 namespace + 各占文件）: 按区域抽取

每个任务独立、文件不相交。模式统一（对每个任务套用）：
1. Read 该区域的 .tsx，找出全部 UI 中文（含属性 aria-label/title/alt/placeholder、常量表如 MONEY_LABEL、模板插值）。
2. 建 `messages/zh/<ns>.json`（原文逐字）+ `messages/ru/<ns>.json`（Claude 译，引用 `@/i18n/glossary`）；计数文案用 ICU plural（ru 三态）。
3. 改 .tsx：client 组件用 `useTranslations("<ns>")`，server 组件用 `getTranslations`；插值用 `t("k", {month, day})`。
4. 把本任务清理的文件加入 no-cjk guard 清单。
5. Gate: `cd web && bun run tsc --noEmit && bun run vitest run`（含 parity guard）+ 该区域若有 e2e 则跑。commit。

**任务分配（namespace ↔ 文件，互斥）:**

| 任务 | namespace | 文件 | 串数 |
|---|---|---|---|
| T2 | `input` `forms` | `[locale]/input/page.tsx`、`components/BirthDateField.tsx` | ~36 |
| T3 | `chart` `me` | `[locale]/chart/page.tsx`、`[locale]/me/page.tsx`、`me/birth`、`me/settings` | ~44 |
| T4 | `today` `components.todayCell` | `[locale]/today/page.tsx`、`components/TodayCell.tsx` | ~71 |
| T5 | `chat` | `[locale]/chat/page.tsx`、`components/MollyThinking.tsx` | ~18 |
| T6 | `synastry` | `[locale]/synastry/page.tsx`、`synastry/invite/[token]/page.tsx` | ~119 |
| T7 | `wealth` `body` | `[locale]/wealth/page.tsx`、`[locale]/body/page.tsx` | ~72 |
| T8 | `register` `calibration` | `[locale]/register/page.tsx`、`[locale]/calibration/page.tsx` | ~53 |
| T9 | `history` `share` `admin` `components.*` | `history`、`share`、`admin`、`components/{InstallPrompt,TimeDetective,FeedbackButton,BackButton}.tsx` | ~80 |

（admin 内部页可低优先；若 CJK 残留与对外无关，可在 guard 清单豁免并注明。）

---

## Task 10（serial · 收口）: 启用全量 no-cjk guard + 全量 gate + PR

**AC:**
- no-cjk guard 去掉清单参数 → **全量断言** `src/app`+`src/components` 无残留 UI CJK（C 区路径除外）。绿。
- message-key-parity 全量绿。
- **全量 gate**（PR 前强制，逐条 exit=0）：`cd web && bun run tsc --noEmit && bun run vitest run && bun run build && bun run test:e2e`。
- 抽样：zh `/` 与 ru `/ru` 关键页（input/today/chart/synastry）截图，确认 zh 原样、ru 全俄文无中文残留、布局不溢出。
- push + `gh pr create`。

---

## 验收（DoD for B）
- [ ] 全部 UI chrome 在 zh/ru 都出对应语言，无中俄混排。
- [ ] no-cjk + key-parity guard 全量绿且进 CI。
- [ ] tsc/vitest/build/e2e 全量绿（带证据）。
- [ ] 既有 guard 不破。
- [ ] ru 译文引用统一术语表。
- [ ] PR 开出、CI 全绿。
