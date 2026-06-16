# T3 · 校准环（出生时辰）实施计划

> **执行方式**：superpowers:subagent-driven-development 逐任务。步骤 `- [ ]`。
> **排序**：**接在 T1+T2（今日格 + 财运 tab）之后**——潜伏校准要靠 T1 的"每日 verdict + 验证微互动 + 备战糖位"喂料，cell 不在就没食物。
> **目标**：把校准从"onboarding 一次性挑个上升 sign"升级成**完整 B×D timeConfidence 环**——onboarding 起手 + 日常潜伏持续收窄她的**出生时辰**，喂回 B 的 mode(house/planet)，实现真·越用越准。
> **采访定案**：校时辰 · 混合(onboarding起手+日常潜伏) · rectification(人生大事对四角) · 完整环 · **真via对天象 + 保留棱角**。
> **UI 真相源**：`design/22-calibration-options.html` —— **T-Q1:B**(事件清单+年龄)、**T-Q2:C**(时辰侦探，A 懂你%兜底)、**T-Q3:A+B**(备战糖卡收料 + 确认后chip加权)。
> **上位法**：charter v1.6（D 单元 + B.4 耦合 + 三诚实注脚）/ Molly 宪法（真vs编、§5.2 占星是镜子）。
> **复用（勿重造）**：`lib/astro/chart.ts`(ephemeris/四角)、`lib/store`(funnel/persist)、`app/calibration/page.tsx`(现有 quiz)、T1 的 `todayVerdict`/备战糖/验证微互动、`lib/track`。
> **工作目录**：`cd .../web`；测试 `./node_modules/.bin/vitest run <path>`；每任务一 commit。

---

## Phase 0 · Orient（读，不写码）

- [ ] 读 `web/AGENTS.md`（改版 Next，写路由/页面前读 node_modules/next/dist/docs）。
- [ ] 读现有契约：`app/input/page.tsx`(knownTime/正午兜底语义)、`app/calibration/page.tsx`(现有3题→setAsc)、`lib/store.ts`(funnel 存什么/persist)、`lib/astro/chart.ts`(**四角/上升计算入口、行运/推运 API、可否传任意 hour 重算**)、T1 产出的 `todayVerdict`(备战糖/验证字段)。
- [ ] 确认 chart.ts 能"给定候选 hour → 重算四角"（rectification 的前提）；不能则先补一个薄封装。

## Phase 1 · `rectify.ts` rectification 引擎（纯逻辑，TDD）

新建 `lib/astro/rectify.ts`。核心：拿她**带日期的人生大事** × **候选时辰** → 评分"该时辰下，事件发生时行运/推运对**四角**的命中强度" → 输出**时辰置信分布**。

- [ ] 类型：
```ts
interface LifeEvent { kind: 'move'|'career'|'relationship'|'health'|'family'; year: number; month?: number }
interface TimeBelief {                  // 时辰置信(出生 hour 上的分布)
  buckets: number[];                    // 24(或48半时)桶权重，和=1
  topRange: [number, number];           // 当前最强连续区间(给"时辰侦探"显示)
  confidence: number;                   // 0..1(分布越尖越高)
  mode: 'planet' | 'house';             // confidence≥阈值→house
}
```
- [ ] **失败测试** `rectify.test.ts`（强断言）：
  - 确定性：同(birthDate,events) → `toEqual`。
  - 多事件比单事件 `confidence` 更高（交叉收窄，对应 T-Q1:B 选清单的理由）。
  - 无事件 → 均匀分布、`mode='planet'`、`confidence≈0`。
  - 事件加入后 `topRange` 跨度**单调不增**（越补越窄）。
  - `mode` 在 confidence 过阈值时翻 `house`（接 B 的 C 双模式）。
- [ ] 实现：对每个候选 hour 重算四角（chart.ts）→ 对每个事件算其发生时行运/推运对四角的最紧命中分 → 桶权重 = 各事件分之积/和 → 归一化；topRange/confidence 由分布形状定。
- [ ] 测试绿，commit。

## Phase 2 · timeConfidence 状态 + 收窄更新（TDD）

- [ ] `lib/astro/timeBelief.ts`：`seed(birthDate, events) → TimeBelief`（调 rectify）；`refine(prev, signal) → TimeBelief`（吸收新信号）。
- [ ] 信号类型与**权重**（守诚实注脚③：行为+事件 > 准/不准）：
  - `event`(新增/补全人生大事) = 强（走 rectify 重算）。
  - `confirm`(她确认了一条**四角/宫位相关**的 verdict) = 中。
  - `traitPick`(onboarding 自我特质题) = 弱起手。
- [ ] **失败测试**：event 信号收窄最多；confirm 只微调不翻盘；trait 仅起手；**`refine` 永不把 confidence 推到 1**（守"她的确认所揭示的真"，不假装上帝视角）。
- [ ] 持久化：存进 funnel/账户（跨设备，服务端单一真相源，同 chart-computation §4）。commit。

## Phase 3 · timeConfidence → B（闭 B×D 环）

- [ ] T1 的 `todayVerdict` 入参加 `belief: TimeBelief`；`belief.mode` 决定命中检测用宫位增强(house)还是行星降级(planet)。
- [ ] **失败测试**：同盘同日，`mode='house'`(belief 收窄) vs `'planet'`(belief 宽) → verdict 的 `natalHit`/文案**可感不同**（按盘×belief 真变，登记进 content-freshness）。
- [ ] **诚实注脚①**：测"belief 宽(头2周典型)时 planet 模式产出仍完整、不空、不报错"——planet 必须独立扛。commit。

## Phase 4 · onboarding 起手（升级 calibration 页，T-Q1:B）

- [ ] 改 `app/calibration/page.tsx`：保留 1–2 题自我特质（弱起手），**新增"人生大事"题（事件清单多选 + 每件年龄/年份 slider，照 design/22 的 T-Q1:B）** → 产出 `LifeEvent[]` → `seed()` → 存 TimeBelief（替换现有 crude setAsc）。
- [ ] 文案守"真via对天象"：题面点明"大事会在你盘的四角留印，我用它反推你的出生时刻"（§5.2 镜子、不假装算命）。
- [ ] E2E：input→calibration(答特质+大事)→reading；断言 TimeBelief 落库、reading 用上。commit。

## Phase 5 · 越用越准 UI（T-Q2:C 时辰侦探 + A 兜底）

- [ ] **时辰侦探**组件（照 design/22 T-Q2:C）：24h 条 + 高亮 `topRange` + "已锁到 X 小时内"；放在 onboarding 后的揭晓 + "我的"里可回看。
- [ ] **A 兜底**：复用现有"懂你% ↑"，确认/补料时弹"+N% 校准"微反馈（ambient）。
- [ ] **失败测试/契约**：不同 belief → 时辰侦探 `topRange` 呈现 `not.toBe`（动态内容契约，按收窄真变）。
- [ ] 起 dev server 实走 onboarding→时辰侦探，截图存证。commit。

## Phase 6 · 日常潜伏（T-Q3:A 备战糖收料 + B 确认 chip 加权）

- [ ] **A 备战糖卡**（复用 T1 平淡日备战糖位）：当 belief 还宽且有"半填事件"(只填了年没填月)时，平淡日插一条"想起来了吗——那次搬家具体哪个月？补一下盘更准 →" → 补全走 `refine(event)`。
- [ ] **B 确认后 chip**：T1 验证微互动里，凡判词是**四角/宫位相关**的，她点"准/不准"额外触发 `refine(confirm)` + 显"✦ 这条跟你的时辰有关·+1%校准"。
- [ ] **失败测试**：confirm 一条四角相关判词 → belief.confidence 微升；confirm 一条纯行星判词 → 不动（只四角相关的才喂时辰）。commit。

## Phase 7 · 棱角守护 + 契约收口

- [ ] **保留棱角不变量（守"真vs编"+情感诚实）**：加 guard 测——校准只收窄**时辰/命中精度**，**不得软化 verdict 的情感诚实**（即 belief 收窄不能让红日变少、不能让"戳痛"判词被过滤成只剩顺耳的）。**测：同 belief 下，verdict 仍按 wealth/相位出红绿、不因"她爱听"而偏移。**
- [ ] content-freshness 登记：时辰侦探 topRange（按 belief）、verdict（按 belief.mode）为动态面，强断言。
- [ ] eval-harness：rectification 题面 + 时辰侦探文案过 charter（真via对天象、不假装算命、不冒充）。
- [ ] 全量 typecheck + vitest + next build + e2e 绿。

## 验收（DoD）

1. onboarding 收 1–2 自我特质 + 人生大事(清单+年龄) → 种出 TimeBelief（替换 crude setAsc）。
2. rectify 引擎按"事件对四角命中"产出时辰分布，多事件更准、单调收窄、永不到 confidence=1。
3. belief 喂回 B：收窄→house 增强、宽→planet 独立扛（头2周不崩）。
4. 时辰侦探 24h→窄区间可感；懂你% 微反馈兜底。
5. 日常潜伏：平淡日备战糖补料 + 四角相关确认加权；纯行星确认不喂时辰。
6. 棱角守护：校准只收窄时辰精度，不软化情感诚实/不减红日。CI 全绿。

## 不在 T3（再后续）

健康轨时辰依赖、Now/Month/Era 缩放、5天弧/PWA/召回、农历↔阳历输入修复（独立小任务，与时辰校准无关）。
