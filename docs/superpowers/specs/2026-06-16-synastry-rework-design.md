# 合盘重做（#5 关系引擎）— 设计 spec

**日期**：2026-06-16 · **项目**：astro-master（Molly） · **状态**：草案待审
**起因**：`docs/2026-06-15-relationship-engine-design.md` §3「合盘重做」落地。Kevin 拍板：**§3 六项全做 + 分型解读走 LLM 实时生成**。
**上游**：本 spec 把 §3（写于宪法 v2.1 之前）与 `docs/2026-06-16-molly-constitution.md` v2.1 对齐后展开。
**Mockup**：`docs/2026-06-16-synastry-rework-mockups.html`（高保真渲染稿，已 Kevin review）。

---

## 设计决策（Kevin 拍板，2026-06-16）

| # | 决策 | 影响 |
|---|---|---|
| D1 | **对方(B 端)填完也看到合盘结果**（从 TA 视角写） | 裂变高潮；B 端新增结果屏 + 转化屏（见 §3 Unit H）。隐私：只暴露配对层相位，不泄 A 原始出生数据（§9.3）。 |
| D2 | **关系类型随邀请链接传给对方** | invite 记录增 `type` 字段；B 落地页/结果按该 type 渲染。 |
| D3 | **A 改成「先选类型 → 再邀请」** | D2 的前提。A 仍可在 demo 态浏览类型；点「邀请」时捕获当前 type 写入 invite。 |
| D4 | 结果页块顺序：**总分 → 维度条 → 解读** | 维持现有 #1/#2 节奏，无额外工作。 |
| D5 | 文案**再狠一点** | 更直接命名真实张力；**守 §8.1**（狠来自真实星盘诚实呈现，不编造/夸大负面情绪）+ **§10**（至少留一个能动转身，不把人按在伤口里）。 |
| D6 | 下钻**显示全部命中相位**（非 top-N） | Unit A 返回全部过 orb 阈值的相位，按 strength 降序；阈值天然把每维限到几条。 |
| D7 | 「已合的人」列表**直接显示分数** | 一眼回看 + 分数是回访钩子。 |

## 0. 目标与非目标

**目标**：把合盘从「5 类型共用 mad-lib 模板的半成品」做成「全 app 最病毒的面」——
1. **分型解读**：杀掉共用模板，每个 RelType 独立、LLM 实时生成、锚真实跨盘相位。
2. **点名两人**：结果里出现「你 ↔ {对方名} · {关系}盘」。
3. **等待态优化**：显示对方名 + 脉冲/进度，替换现在的静默 4s 轮询。
4. **显眼发链接**：把「发链接给 TA」做成明确动作（病毒回路第一步现在是断的）。
5. **维度下钻到星位**：每个维度可点 →「哪些星位造成的」（用真实 synastry 跨盘相位）。
6. **再合一个人循环 + 已合的人管理**。

**非目标（YAGNI / 本轮不做）**：
- 合盘**不接入 UserModel**（合盘是「配对」，不是「越用越准」的个人记忆轴）——因此**不宣称越用越准**（宪法 §6.5：不许空头支票）。
- 不接真实支付墙（合盘默认免费病毒面；变现位若要，另起 spec）。
- 不改 synastry 的**分数算法**（保 `synastry.test.ts` 30 条 baseline 不破）；下钻只**暴露**已算出的相位。

---

## 1. 宪法对账（写代码前过 R4 宣称 + §8 亮线 + §9 安全）

| 宪法条 | 本设计怎么守 |
|---|---|
| **§4.1 具体压倒泛泛（护城河）** | 分型解读走 LLM，吃**两个真实盘的真实跨盘相位**，不是套话模板。这是选 LLM 而非 copy 银行的根本理由。 |
| **§4.2 忠于星盘 / §6.1 不编星位** | 复用 `/api/reading` 铁律：**Claude 只写 prose，所有星位事实由引擎确定性算好喂进去**。prompt 只给真实计算的跨盘相位 + 两盘 `facts()`，禁止模型生造相位。 |
| **§7 紧迫感绿灯 / §8 三条亮线** | demo 态（无真人配对）**绝不给任何分数或解读**——保留现有强卡口（`page.tsx` `if (demo)` 分支），只展示「会测哪几个维度名」当裂变钩子。**这是 §8.3「不靠欺骗换指标」的硬实现**，重做时一字不能松。 |
| **§3.7 病毒拉满** | 显眼发链接 + 合盘卡分享 + B 端填完引导看自己本命（已有，强化）。裂变往大里做。 |
| **§9.3 敏感数据（双向）** | 双方只交换**计算后 chart（placements）**，互不见对方 `birthForm`（原始生日/时间/城市）。B-5 让 B 看到 A 的派生盘是新增暴露面——明确限定为派生盘、不含原始数据（见 Unit H 服务端）。重做不得回退。 |
| **§8.1 情绪不夸大（D5 再狠的护栏）** | 文案加狠 = 更直接命名**真实**张力（锚真实相位），**不**为冲击力编造/夸大负面后果；金句至少留一个能动转身（§10，不把人按在伤口里）。eval 对照 §8.1 rubric。 |
| **R4（WORKFLOW）能力宣称对账** | 新增宣称仅：「真实契合度」（仅真人配对时给，已守）、「哪些星位造成的」（下钻必须真用 aspect 数据，不能是装饰）。**不**新增「越用越准」。 |

---

## 2. 现状诊断（病，来自 §3 + 活代码）

| 面 | 文件 | 病 |
|---|---|---|
| 解读 | `synastry/page.tsx:24-34 reading()` | 5 类型共用 mad-lib；金句「得有一个人先松口」对同事/朋友盘是错的 |
| 点名 | `Result()` | 正文不点两人名字（连接横幅有名字，结果正文没有） |
| 等待 | `page.tsx:60-88` 轮询 | 静默 4s 轮询，没对方名/脉冲/进度 |
| 发链接 | 邀请面板 | 有按钮但不够「动作化」，病毒第一步弱 |
| 下钻 | `synastry.ts` | 维度只有分数，引擎算了跨盘相位但不 return，UI 不可点 |
| 再合 | — | 无「再合一个人」循环，无已合的人管理 |
| 存卡 | `Result` →`/share` | `/share` 是本命卡，没有合盘卡变体 |

---

## 3. 架构：7 个单元（一地基 + 六出口映射）

每个单元单一职责、接口清晰、可独立测。

### Unit A — 引擎暴露跨盘相位（`lib/astro/synastry.ts`）
- `SynDim` 增 `aspects: SynAspect[]`，`SynAspect = { a: BodyName; b: BodyName; angle: number; kind: "harmony"|"tension"; strength: number }`。
- `dimScore()` 已经在内部算 `sep`/`near`，改为**同时收集**命中的 pair（strength ≥ orb 阈值），按 strength 降序返回**全部命中**（D6——不设 top-N；orb 阈值天然把每维限到几条）。`a`/`b` 命名为「A 方的星 / B 方的星」。
- **不改分数公式**——只把已算的中间量吐出来。`synastry.test.ts` 30 条 baseline 的 `total`/`value` 断言全部不变；新增 `aspects` 断言。
- 依赖：`chart.placements`（已有）。无 I/O。纯函数，先红后绿。

### Unit B — 分型解读 LLM 路由（`app/api/synastry/reading/route.ts`，镜像 `/api/reading`）
- POST `{ selfChart, otherChart, type, selfName, otherName, gender }`。**视角化**：A 调用时 self=A，B 调用时 self=B（D1）——同路由、换参数，解读从调用者视角写（「你的金星撞他的火星」）。cache key 含视角方向。
- **per-RelType deterministic scaffold**：把现有 `reading()` 升级为 `synScaffold(result, type)`——**每个 RelType 一套**模板（杀 mad-lib 的最低保证），作为①rate-limit/AI-off/失败时的 graceful fallback ②LLM prose 的结构骨架。
- prompt：喂 `facts(chartA)` + `facts(chartB)` + 引擎返回的真实跨盘相位 + 两人名 + RelType 专属取向；要求输出 JSON `{ vibe, body, catchLine }`（镜像 `parseAi`）。system 用 `personaFor(gender) + SAFETY`。
- cache key = `syn:${type}:${sigA}:${sigB}`（顺序规范化，A/B 对调命中同 key）；命中不计费。
- rate-limit 复用 `RULES.reading()`；`logUsage({ route: "synastry" })`。
- **仅真人配对调用**（demo 永不到这条路由）。失败→per-RelType scaffold（200，不 cached），永不 500。

### Unit C — 客户端 remote + 渐进升级（`lib/reading/remote.ts` 加 `fetchSynastryRead`）
- `AI_ON` gate（同其它出口）。结果页先渲染 per-RelType scaffold（即时），LLM 回来后台替换 prose。
- 超时/失败/AI-off → 返回 null → 用 scaffold。**fallback 也必须 per-RelType**，绝不退回共用模板。

### Unit D — 结果页点名 + 维度可点下钻（`synastry/page.tsx Result`）
- 标题：`你 ↔ {对方名} · {关系}盘`。
- 每条维度条**可点** → 展开 panel：用 Unit A 的 `dim.aspects` 渲染「{你的}{星} {相位} {对方的}{星}」+ 一句这相位在这维度的意味（取自 scaffold/LLM）。
- a11y：维度是 `<button>` + `aria-expanded`，panel `aria-live` 视情况；非颜色区分（和谐/张力加图标）。

### Unit E — 等待态（`page.tsx` 轮询 UI）
- 链接发出后、对方未填：显示「等 {对方名或'对方'} 填好…」+ 脉冲动画（`prefers-reduced-motion` 降级为静态）。
- 轮询命中即切「✓ 已连接」（已有逻辑，补 UI 态）。
- 列清单：loading（创建 invite 中）/ waiting（等对方）/ empty（还没建 invite）/ error（建失败）/ connected。

### Unit F — 显眼发链接 + 合盘卡（`page.tsx` 邀请面板 + `lib/share/card.ts` + `/share` 或新卡）
- 发链接做成主按钮 + 原生 `navigator.share`（移动端拉起系统分享面板）+ 复制兜底。
- 合盘卡：`buildCardSVG` 加 synastry 模板变体（CardData 扩展承载 `你↔对方 / 关系 / 总分 / 金句`），「把这份合盘存成卡」走这个变体而非本命卡。
- §8.3：卡上若出现分数，仅真人配对可生成（demo 无卡）。

### Unit G — 再合一个人循环 + 已合的人管理（`page.tsx` + `lib/synastryTokens.ts`）
- 结果页加「再合一个人 →」回选关系/重新邀请。
- 已合的人列表：`synastryTokens` 已存 token 数组，扩展为存 `{ token, name, chartSig, type, total }`，渲染「已合的人」**带分数**（D7）可重看/删除。
- 删除 = 本地清 token（不动服务端 KV 的隐私数据留存策略）。

### Unit H — 对方(B 端)完整旅程（`app/synastry/invite/[token]/page.tsx` + invite 服务端）
裂变回路的另一半，是一条独立的端到端路径，不止表单。6 态：
- **B-1 loading**：校验 token（已有，补 UI）。
- **B-2 invalid**：链接失效（已有）+ 「了解 Molly」获客出口。
- **B-3 表单**：标题带 A 选的 type（D2/D3，「{A} 想测你俩的{关系}盘」）；诚实时间默认（不知道→正午，已有）；隐私声明（已有）；**滚动容器 + 吸底提交**（沿用 `form-scroll` guard 防安卓键盘遮挡）。
- **B-4 submitting**：「正在为你俩排盘…」（已有）。
- **B-5 结果（新增 · D1）**：B 提交后用 `synastry(chartB, chartA, type)` + Unit B（self=B 视角）展示合盘给 B 看。**仅配对层结果，不显示 A 的原始出生信息（§9.3）。**
- **B-6 转化（新增）**：「{A} 让 Molly 看穿了你俩，那单看你呢?」→ 引导 B 走自己本命漏斗（把对方变用户）；次级「把这份合盘存成卡」。
- **服务端（承重假设 · 现状不满足，必须先改）**：现 `createInvite(inviterName)` **只存名字，不存 A 的盘**——B-5 无法成立。改：
  - `Invite` 增 `inviterChart: unknown` + `type: RelType`；`createInvite(inviterName, inviterChart, type)` 写入（A 创建时带上，D2/D3）。
  - `GET /api/synastry/invite?token=` 返回 `inviterChart`（供 B-5 算盘）。
  - **隐私边界（§9.3 守住）**：存/返回的是 A 的**计算后 chart（placements）**，**不存、不返回 A 的 `birthForm`**（原始生日/时间/城市）。A↔B 对称：双方都只拿到对方派生盘，拿不到对方原始出生数据。
  - 信任模型不变：token 即 capability，持链接者可读配对槽——A 分享链接本就意图合盘，等价同意暴露自己**派生盘**（非原始数据）。

---

## 4. 数据流（端到端）

```
A 进 /synastry
  → 选 RelType (D3，先选再邀)
  → 建 invite (Unit F)  ─POST /api/synastry/invite {inviterName, inviterChart, type}→ token+链接
  → 等待态 (Unit E)     ─poll /api/synastry/invite→ realPartner 回填
B 开 /synastry/invite/[token] (Unit H)
  → GET invite → {inviterName, inviterChart(派生), type}
  → B-3 表单（标题带 type）→ POST .../submit→ 绑 B 算好的盘到 token（双方互不见原始信息 §9.3）
  → B-5 看合盘：synastry(chartB, chartA, type) + Unit B(self=B 视角) → 结果
  → B-6 转化：引导 B 走自己本命漏斗
A 端（轮询命中后）
  → synastry(chartA, chartB, type) (Unit A) → dims + 每维全部命中 aspects (D6)
  → fetchSynastryRead (Unit C) → /api/synastry/reading (Unit B, self=A) → {vibe,body,catchLine}（cache/fallback）
  → 结果页 (Unit D)：点名两人 → 总分 → 维度条 → 解读 (D4) · 点维度下钻
  → 存合盘卡 (Unit F) / 再合一个人 + 已合的人(带分数 D7) (Unit G)
```

---

## 5. 测试策略（对齐 WORKFLOW R1–R6 + R14/R15 动态内容契约 + §9 流程完整性）

1. **引擎（Unit A）**：`synastry.test.ts` — 30 条 baseline `total`/`value` **不变**；新增：`aspects` 非空、按 strength 降序、kind 正确、阈值过滤、A/B 对调对称。
2. **LLM 路由（Unit B）**：镜像 `reading/route.test.ts` — bad body 400、无真盘拒绝、cache 命中不计费、fallback 路径返回 per-RelType scaffold（**断言不同 type 的 fallback 文案不同**，证明杀了 mad-lib）。
3. **动态内容契约（R14/R15，硬 gate）**：在 `web/src/__guards__/content-freshness.test.ts` **登记强断言**——
   - 同一对盘、**相邻 RelType** 的解读 `not.toBe`（按关系类型变）。
   - 同一 RelType、**不同配对盘** 的解读/分数 `not.toBe`（按配对变）。
   - **禁** `Set(...).size>1` 弱断言。
4. **流程完整性（§9，硬 gate · 本次返工的根因）**：**两个角色各走完整路径**——
   - A 端：选型→建 invite→等待→回填→结果→下钻→存卡→再合→已合空态。
   - **B 端（最易漏，这次专门补）**：loading→invalid→表单(带 type)→submitting→**B-5 结果**→B-6 转化。
   - 每屏每态（loading/empty/error/waiting/invalid/connected/done）列「有屏 或 无需」清单贴进 PR。重点查：等待态、B-5 结果、分享、再合后空态。
5. **e2e**：playwright 合盘 journey（mock invite KV + AI off 跑 scaffold 路径，断言点名出现、维度可点开、再合回到选型）。
6. **机制自查**：见 §6。

---

## 6. 风险 / 承重假设自查（流畅 ≠ 正确）

| 风险 | 缓解 |
|---|---|
| **承重假设：LLM 能稳定产出合法 JSON 分型解读** | 这正是 `/api/reading` 已在生产验证过的同款模式（`parseAi` + graceful fallback）。复用 = 降险，不是新赌。 |
| **承重假设：B-5 要看合盘必须有 A 的盘——现状 invite 不存 A 的盘** | 已定位（`synastry-invite.ts` 只存 inviterName）。PR1.5 先补 `inviterChart`，否则 B-5 / 类型传递整块塌。列为 B 端旅程的前置 PR。 |
| LLM 延迟卡结果页 | 渐进 UX：per-RelType scaffold **即时**渲染，LLM prose 后台升级（镜像现有 reading 渐进）。用户永不空等。 |
| LLM 成本天花板（STATUS 已挂红） | cache by (sigA,sigB,type) 命中不计费；rate-limit 复用；**仅真人配对调用**（demo 不调，省掉大头）。 |
| fallback 退回共用模板 = 没杀成 mad-lib | scaffold **本身就 per-RelType**；测试 #2 强制断言不同 type fallback 文案不同。 |
| 下钻改坏分数算法 | Unit A 只 return 中间量，不碰公式；30 条 baseline 断言守门。 |
| §8.3 强卡口被重做冲掉 | demo 分支保留为**第一道**渲染判断；e2e 断言 demo 态无分数/无解读/无卡。 |

---

## 7. 落地分期（多 PR，符合并行协作硬规则：worktree 隔离 + 只进不改写 + CI 绿才合）

| PR | 单元 | 说明 | 依赖 |
|---|---|---|---|
| **PR1** | A | 引擎暴露跨盘相位（全部命中 D6；纯逻辑，先红后绿，不碰 UI） | — |
| **PR1.5** | 服务端 | invite 增 `inviterChart`+`type`，GET 返回 inviterChart（派生，守 §9.3）。**B-5 / 类型传递的承重前置** | — |
| **PR2** | B+C | 视角化分型解读 LLM + per-RelType scaffold（杀 mad-lib 核心 + 渐进升级 + fallback） | PR1（下钻文案可后补） |
| **PR3** | D+E | 结果页点名两人 + 维度下钻 + 等待态（A 改先选类型再邀 D3） | PR1、PR1.5、PR2 |
| **PR4** | F | 显眼发链接 + 合盘卡变体 | PR3 |
| **PR5** | G | 再合一个人循环 + 已合的人（带分数 D7） | PR3 |
| **PR6** | H | 对方 B 端完整旅程（6 态：loading/invalid/表单带type/submitting/B-5结果/B-6转化） | PR1.5、PR2 |

每个 PR 独立可测、独立上线；各自 worktree + 分支；过 `tsc --noEmit` + `vitest run` + `next build` + playwright e2e（required checks）才合。

---

## 8. 出码前自检模板（每个 PR 贴进描述，WORKFLOW §出码前自检）

```
[状态清单 R3]   本屏 loading/empty/error/waiting：<位置 或 无需>
[宣称对账 R4]   新增/改动宣称：<逐条「已兑现:位置」或「已删」>
[亮线 §8]       demo 态无分/无解读/无卡：<e2e 位置>
[a11y §11]      8 条逐项过
[动态契约 R14]  content-freshness 强断言已登记：<位置>
[测试]          typecheck=0 · vitest 全绿 · build 成功 · 相关 E2E 绿
```
