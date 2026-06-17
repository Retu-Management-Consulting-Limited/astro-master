# T4 · 健康轨（身心）实施计划

> **执行方式**：subagent-driven-development 逐任务，`- [ ]`。
> **目标**：加第二条轨「身心」（月亮+六宫+火/土 → 每日身心态），与财运对称：**两轨都 chip→各自日历页、都不当 tab（回 4 tab）**，今日格显当天**主导轨**。守 charter：说倾向不说病 · 症状自证 · 真信号转专业。
> **UI 真相源**：`design/23-health-channel-options.html`（终版 X）。**上位法**：charter v1.6（双轨 + 健康域线）/ Molly 宪法 v2.1（真vs编、§6.4 转专业、§9 安全）。
> **复用（已在 main，勿重造）**：`lib/reading/todayVerdict.ts`（三态判词，加 channel）、`lib/astro/wealth.ts`（旺平慎+memo配额模式）、`lib/reading/calibrationSignal.ts`（四角确认喂时辰）、`lib/astro/timeBelief.ts`、`components/TodayCell.tsx`、`app/wealth`（财运日历，要从 tab 降 chip→页）、`components/TabBar.tsx`、`__guards__/edge-preservation.test.ts`。
> **工作目录**：`cd .../web`；测试 `./node_modules/.bin/vitest run`；**每切片 PR 前跑全量 gate（tsc+全量vitest+next build+全e2e）**；每任务一 commit。

---

## Phase 0 · Orient
- [ ] 读 `web/AGENTS.md`（改版 Next）。读真实签名：`todayVerdict.ts`（怎么加 channel/身心）、`wealth.ts`（旺平慎+monthLevels memo，照它做身心评分+配额）、`TodayCell.tsx`/`TabBar.tsx`/`app/wealth`、`calibrationSignal.ts`（四角确认接口）、`app/today/page.tsx`（chip 现状）。

## Phase 1 · 身心评分引擎 `lib/astro/body.ts`（纯逻辑 TDD）
- [ ] 照 wealth.ts 模式：`bodyScore(chart,date)`（月亮态 + 六宫行运 + 火/土压力）→ `bodyLevel`，**用与财运同一套红/绿/平行动灯语义**：低/该歇/留意 = **红**、有劲/状态好 = **绿**、平稳 = **平**（别另起一套色/词，两轨颜色一致——见 UI 真相源 design/23）；`monthBodyLevels` 配额（**memo，照 wealth 防平台浮点非确定**）。
- [ ] **TodayCell / 日历组件复用同一套红/绿/平渲染**（财运/身心共用，只是 label 与内容不同），不为身心新建配色。
- [ ] 测：确定性、按天变、按盘不同、稀有配额、memo 同参恒等（edge-preservation 同款）。

## Phase 2 · 身心判词 + channel 选择
- [ ] `todayVerdict` 扩成双轨：算财运 verdict + 身心 verdict，按强度选**主导 channel**（`channel: '钱'|'健康'`），主导那条当今日格主体；另一条进 chip。身心判词：能量态主句（安抚/permission）+ 内在 why（怎么待自己）+ 自我照顾许可 + **症状自证微互动**。
- [ ] **「身体留意区」组件**（稀有，慢相位/六宫被压才出）：按医疗占星的**部位映射**（土星=骨骼/牙齿/关节、六宫=消化、火星=发炎/急症…）**点名该留意的身体区域** + **问她那块有没有信号**（搜集信息→喂身心模型）+ **有分量→转专业（看医生/对应科室）**。这是"主动指出潜在区域 + 信息搜集"的落点。
- [ ] **守 charter 硬约束（区域 ✓ / 诊断 ✗）**：① 可**点名区域 + 自证 + 转专业**（"消化这块该留意，最近肠胃给信号没？该查就查"）；② **禁器官病种断言/诊断**（"你心脏有病/你有 X 病" = 编 + nocebo + 冒充医疗，§6.4/§9）；③ **高风险器官（心/脑/肝）必连转专业、app 不自己断言**。症状她自证得了的可问；病她答不了的不点名。state 仍belief-无关（沿 edge-preservation）。
- [ ] 测：双轨各出、主导选择按强度、身心 state 来自 bodyLevel、症状自证问内在、无诊断断言。

## Phase 3 · IA 重构（财运 tab → chip；回 4 tab）
- [ ] **TabBar 从 5 tab 改回 4 tab**（今日/本命/对话/我的）——移除财运 tab。`app/wealth` 保留为**页**，改由今日格 chip 进入（非 tab 根；route-exit 用 BackButton 满足）。
- [ ] `TodayCell` 加**双 chip**（财运+身心，恒在，主导加亮）→ 各自 `/wealth` 与新 `/body`(身心日历)。
- [ ] e2e 改：today→财运 chip→/wealth、today→身心 chip→/body，都不漏屏；**原走财运 tab 的 e2e 改走 chip**（避免重蹈 calibration helper 没同步的回归）。

## Phase 4 · 身心日历页 `/body`
- [ ] 照 `app/wealth` 模式建身心日历（月相/能量周期、疏密=平淡为底、点未来格看那天身心态预览）+ "看更深"入口（身心深度/自我照顾）。
- [ ] content-freshness 登记身心日历强断言。

## Phase 5 · 症状自证 → 喂模型 + 喂时辰校准
- [x] 身心判词的症状自证微互动：她确认 → 喂身心自我模型；**若该症状是四角/六宫相关，顺手 `refine(confirm)` 喂 timeBelief**（接 T3 calibrationSignal，纯行星相关不喂）。实作：`confirmBodySignal(prev, BodySignalSource)`，zone=六宫→必喂、selfCheck=四角 target 才喂；`bodyVerdict.selfCheck.target` 携带驱动点。
- [x] 测：四角相关身心确认→belief 微升；纯行星身心确认→belief 不动（referentially equal）。+ 端到端用真盘真红日 selfCheck.target / 真 zone 钉接线；content-freshness 中央登记。

## Phase 6 · 护栏 + 契约收口
- [ ] **身心守宪 guard**：新增 test 断言身心文案无诊断/病种断言、有转专业兜底、说倾向、过 money/guardrail 真vs编；edge-preservation 扩到身心（校准不软化身心情感诚实、不减"留意"日）。
- [ ] content-freshness 中央登记：身心判词三态、身心日历、主导 channel 选择（按盘/按天 not.toBe）。
- [ ] **全量 gate**：tsc + 全量 vitest + next build + **全 e2e** 全绿（含改过的财运 chip 走法、新身心走法）。

## 验收（DoD）
1. 今日格显当天主导轨（财运重显财运三态 / 身心累显身心态）；财运+身心双 chip 恒在、主导加亮、各进日历。**回 4 tab**。
2. 身心轨：月亮+六宫驱动每日态，安抚/permission 主味，**说倾向不说病 + 症状自证 + 真信号转专业**。
3. 症状自证喂身心模型 + 四角相关顺手喂时辰校准。
4. 身心日历 `/body` = 月相/能量+疏密平淡为底+预览+看更深。
5. 全量 gate 全绿（tsc+vitest+build+全e2e）；身心守宪 guard + content-freshness 登记。

## 不在 T4（再后续）
Now/Month/Era 缩放 · 5天弧/PWA/召回。
