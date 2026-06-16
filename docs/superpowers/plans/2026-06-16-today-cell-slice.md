# 今日格三态 + 财运 tab（T1+T2）实施计划

> **执行方式**：用 superpowers:subagent-driven-development 或 executing-plans 逐任务做。步骤用 `- [ ]`。
> **目标**：把现有 `app/today` 的「今」卡 reshape 成 charter 附录A **三态行动灯**（红慎/绿宜旺/平淡），并把**财运升为第 5 个底部 tab**（Q1-A）+ 财运页。保留昨/今/明骨架（Q2-A），声音用笃定带温度（Q3-B）。
> **UI 真相源**：`design/20-today-cell-states.html`（终版）。**上位法**：`docs/2026-06-16-personal-calendar-charter-design.md`（charter v1.6）+ `docs/2026-06-16-molly-constitution.md`（真vs编）。
> **gap 依据**：`docs/superpowers/specs/2026-06-16-calendar-gap-analysis.md`。
> **工作目录**：`cd .../web`；测试 `./node_modules/.bin/vitest run <path>`；每任务一 commit。
> **复用（已建，勿重造）**：`lib/astro/wealth.ts`(旺/平/慎)、`lib/reading/daily.ts`(每日+内在CLAIMS)、`lib/money/{persona,guardrail,behavior}.ts`、`__guards__/content-freshness.test.ts`。

---

## Phase 0 · Orient（先读，不写码）

- [ ] **读现有契约**（拿到精确签名再动手）：`src/app/today/page.tsx`（「今」卡 + fortune chip + tabbar 结构）、`src/lib/reading/daily.ts`（导出/返回结构、CLAIMS）、`src/lib/astro/wealth.ts`（`wealthScore`/`wealthLevel` 签名）、`src/lib/money/persona.ts`（`styleTag`/fast 表型）、`src/__guards__/content-freshness.test.ts`、`design/20-today-cell-states.html`（UI）。
- [ ] 确认现有 tabbar 是 4 tab（今日/本命/对话/我的）；记录组件位置，T2 要插入"财运"为第 2 个。

## Phase 1 · `todayVerdict.ts`（纯逻辑，TDD）—— T1 的脑

新建 `src/lib/reading/todayVerdict.ts`，产出今日格骨架（消费 wealth + daily + 表型，**不做 LLM**）。

- [ ] **类型**：
```ts
type CellState = '红' | '绿' | '平淡';
type Lean = '刹' | '推';
interface TodayVerdict {
  state: CellState; channel: '钱';           // 本切片仅钱轨(+情绪占位)，健康轨后续
  lean: Lean;
  command: string;    // 主句(命令)        ← 绿:"宜·今天去…" 红:"今天，我拦你一下"
  why: string;        // 内在态(可自证)      ← 绝不外部事件
  sugar: string;      // 赦免(天象归因)
  doorDate?: string;  // 红日前门指向的日期 = nextCharged
  action?: string;    // 绿日可控动作
  nextCharged?: string; // 下一个红/绿日(给红门 & 平淡提前备)
  prep?: string;      // 平淡日备战糖(认信号/提前备)
  verifyAsk: string;  // 验证微互动(内在/行为)
}
```
- [ ] **失败测试** `todayVerdict.test.ts`（强断言）：
  - 确定性：同盘同日 → `toEqual`。
  - `state` 来自 wealth：`wang→绿`、`shen→红`、`ping→平淡`（对照 `wealthLevel`）。
  - **红日必有 `doorDate` 且 `verifyAsk` 是内在**（含"忍住/上头/想要答案"类词，**不含**"赚/收到/中"）。
  - **绿日 `verifyAsk` 问"你动了吗"类、不问"赚了吗"**；绿日 `action` 非空。
  - **平淡日 `prep` 非空**（不空屏）。
  - `lean`：火星重盘→`刹` 起手；土星重盘→`推`（用 persona 的 fast/盘相）。
  - **声音=笃定带温度**：红日 `command` 不含冷判式"别要答案"硬句、走"我拦你一下"型（断言 command 命中暖模板集）。
- [ ] 实现：state←wealth；文案←模板库（红/绿/平淡 各套，绿复用 daily CLAIMS 的内在句 + money 动作）；lean←persona；door/nextCharged←前扫未来 N 天 wealth。
- [ ] 测试绿，commit。

## Phase 2 · 稀有配额 + 解 freshness 冲突（TDD）

- [ ] **失败测试**：`monthlyVerdicts(chart, year, month)` → 红 ≤ 配额（默认 4）、绿 ≤ 配额；长期全平时**保底**把最强日提为红/绿（防整月 0）；多数日 `平淡`（≥ ~60%）。
- [ ] 实现：在 wealth score 之上加**月度排序取头部 + 上下限夹逼**（天定为主：只有 score 够强才入选；保底：若整月候选为空则放宽阈值取最强一天）。
- [ ] **改 `content-freshness.test.ts`（解 gap §2 冲突）**：删/改"本月决定性日 ≥9/30"那条**下限**；新增对**今日格呈现层**的邻日强断言：`todayVerdict(A, d).command/why/prep` 相邻日 `not.toBe`（**含平淡日**——靠 daily/月亮态变），且不同盘同日 `not.toBe`。**freshness 断呈现、不断 chargedness。**
- [ ] 测试绿，commit。

## Phase 3 · 今日格 UI（reshape「今」卡）—— T1 的脸

- [ ] 按 `design/20` 把 `app/today` 的「今」卡渲染成三态（红/绿/平淡），槽位：状态标(慎/宜+财运旺badge/天清) · 命令 · 内在why · 赦免糖 · 动作/前门(日期可点→财运) · 备战糖(平淡) · fortune chip。**保留昨(验证)/明(钩子)两卡（Q2-A）。**
- [ ] 红日前门日期 + chip 链接到财运 tab 对应日（Q：红屏也要日历入口，已定）。
- [ ] 组件级 smoke test：三态各渲染、红日有门、平淡日有备战糖（非空）。
- [ ] 起 dev server 实走 today 屏三态（按天切换或注入 verdict），截图存证（VERIFY-PLAYBOOK）。commit。

## Phase 4 · 财运 tab + 财运页（T2，Q1-A）

- [ ] tabbar 插入"财运"为第 2 个 → 共 5 tab（今日/财运/本命/对话/我的）。
- [ ] 新 `app/money`（或复用现有）作财运页：**月历**(复用 wealth 分级 + `design/09-wealth.html`，疏密=平淡为底)、今日财运 verdict、搞钱黄金日列表、"钱对你意味着什么·看更深"入口(→现有 money mirror/narrative)。
- [ ] 月历"点未来某天"→ 显示那天的 money verdict 预览（规划器）。
- [ ] E2E（playwright）：今日→点财运 tab→月历→点未来格看预览→点"看更深"；断言路径不漏屏。commit。

## Phase 5 · 护栏 + 契约收口

- [ ] guardrail：今日格 LLM 文案（若 verdict 文案走 LLM 渲染）出口过 `validateMoneyCopy` + 新增"真vs编"通用校验（内在不外部、红留门在）。eval-harness 登记今日格三态 rubric。
- [ ] `content-freshness.test.ts` 登记今日格三态 + 财运月历为动态面（强断言）。
- [ ] 全量 `bun run typecheck` + `vitest run` + `next build` + e2e 绿。

## 验收（Definition of Done）

1. today 屏「今」卡按真盘/真行运呈现三态（红慎/绿宜旺/平淡天清），平淡日带备战糖不空屏。
2. 红日命令=笃定带温度("我拦你一下")、有内在why+赦免糖+**可点前门→财运日历**；绿日有可控动作+验证"你动了吗"。
3. 财运是第 5 个 tab；财运页=月历(平淡为底)+黄金日+今日财运+看更深。
4. 红绿受月度稀有配额约束；freshness 断呈现层、不逼 chargedness。
5. 验证只问内在；所有动态面强断言登记；CI 全绿。

## 不在本切片（后续）

健康轨（月亮+六宫，含"症状自证")、校准环(B×D, timeConfidence)、Now/Month/Era 缩放、5天弧/PWA/召回。
