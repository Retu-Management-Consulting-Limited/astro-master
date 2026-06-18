# 子项目 C：Molly 用俄语解读 — 设计 + 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。每任务严格 TDD。Steps 用 `- [ ]`。**本子项目动「Molly 说什么」——开工前必读 `docs/2026-06-16-molly-constitution.md`（§8 三亮线 + §9 安全）并对照。**

**Goal:** 让 Molly 在 locale=ru 时用俄语产出全部解读（LLM 生成 + 确定性内容表），且俄语输出受 §8/§9 宪法 eval 把关、俄语危机检测可靠。

**Architecture:** LLM 调用与 prompt 加 `locale` 参数（不翻译输出、不二次翻译，指示 LLM 直接用俄语生成）。`api/*` 路由拿不到 URL locale → **客户端把 locale 放进 POST body**，API 校验后一路穿到 `runLLM` 与 6 个 prompt 构建器。确定性 Molly 内容表（theme/daily/verdict/openers 等）建俄语版、按 locale 切换。安全层补俄语危机词表（§9 P0）。建俄语 §8/§9 eval 作 gate。

**Tech Stack:** Next 16.2.9（魔改 proxy/异步 params）、next-intl 4.13、@anthropic-ai/sdk + claude-agent-sdk 双路、vitest、bun。

## Global Constraints

- **宪法 gate**：改俄语 persona/解读/内容前对照 §8/§9。改 `constitution-eval-rubric.md` 必须在 `docs/CONSTITUTION-CHANGELOG.md` 登记理由（CI `constitution-gate` 拦未登记改动）。
- **范围**：只动 Molly 声音层（`src/lib/ai/*`、`src/lib/reading/*`、`src/lib/money/narrative.ts`、`src/app/api/*` 的 prompt + 确定性内容表 + 安全）。**UI chrome 属 B，C 不碰 messages/UI .tsx。**
- **zh 行为零回归**：locale=zh（默认）走原中文路径，输出逐字不变；ru 是新增分支。
- **路径**：prompt 加 locale 指示 LLM 直接产俄语；不翻译模板逻辑、不二次翻译。
- **安全不可妥协（§9）**：俄语危机检测必须 native 校验、宁可假阳性不可假阴性。
- **repo 硬规则**：worktree `../molly-i18n-molly` + 分支 `feat/i18n-molly-russian`；main 只 PR；CI 全绿才合。
- 完成宣告带 `exit=0` 证据。
- 术语表：C 在代码层自建俄语星盘术语（扩展 molly.ts 的 PLANET_ZH/HOUSE_ZH 等为 locale-aware）；与 B 的 UI glossary 可能小重叠，D 阶段统一，本期不强求共用。

## ⚠️ 承重风险（错了就垮）

1. **locale 漏传某调用点** → 俄文页面冒中文解读。最易漏：`followups`（嵌套两层、独立 route）、`narrative` 的 `SYSTEM` 常量。→ guard：扫 `runLLM` 调用点，断言 locale 一路到位。
2. **俄语危机检测失效（P0）** → 俄语求救绕过 §9 安全层。→ 必须有俄语 crisis 测试用例 + native 校验。
3. **宪法 eval 假绿灯** → 俄语解读过了弱 eval 实则违 §8。→ eval 用强判据（真盘交叉、关键词 + LLM 判定），登记 rubric。
4. **俄语解读质量/语气**（"看穿你"生硬直译）→ 功能性达标即可，地道度 native 润色留 D，但 §8「真 vs 编」必须本期守住。

---

## M1（serial · 承重地基）: locale 管道贯通

**Files:** Modify `web/src/lib/ai/llm.ts`（runLLM 加 `locale: AppLocale`）、6 个 api route（reading/chat/synastry-reading/narrative/chat-followups）解析+校验 body.locale、各 prompt 构建器加 locale 形参；client fetch 处加 `locale: <当前locale>` 入 body。Create `web/src/__guards__/llm-locale-threaded.test.ts`。

**AC:**
- 每个 LLM 调用点都接收并使用 locale；API 用 `hasLocale(routing.locales, body.locale)` 校验，非法回退 defaultLocale。
- client 侧从 next-intl `useLocale()` 取值放进所有解读类 fetch body。
- guard 断言 6 个 route 的 runLLM 调用 locale 已串到（静态扫描或调用追踪）。
- zh 行为不变（既有 reading/chat/synastry/narrative/followups 测试全绿）。
- Gate: `cd web && bun run tsc --noEmit && bun run build && bun run vitest run` 全 exit=0。

**Steps（TDD）:** 先写 locale-threaded guard 失败测试→改 llm.ts 签名→逐 route 串 locale→client 入 body→绿→commit。

---

## M2（parallel after M1）: Molly persona + prompt 俄语

**Files:** Modify `web/src/lib/ai/molly.ts`（加 `PERSONA_RU`/`PERSONA_RU_MALE`/`SAFETY_RU`，`personaFor(gender, locale)`，`facts(chart, locale)` + `PLANET_RU`/`HOUSE_RU`/`SIGN_RU`）、各 prompt 构建器按 locale 选指示语（含「用俄语回应」+ 格式要求）、`followups.ts` 加 locale。

**AC:**
- locale=ru 时 system = 俄语 persona + SAFETY_RU；prompt 指示俄语输出 + JSON 格式不变。
- `facts()` 在 ru 下返回俄语星盘术语（金星天蝎→Венера в Скорпионе 类）。
- `molly.test.ts` 加 locale 维度：`personaFor(g,'ru')` 返回俄语、含安全约束。
- zh 分支零变化。
- Gate: tsc + vitest（含新增 locale 测试）全 exit=0。

---

## M3（parallel after M1）: 确定性内容表俄译

**Files:** Modify `web/src/lib/reading/{theme,daily,todayVerdict,bodyVerdict,openers,generate}.ts`、`web/src/lib/money/narrative.ts`——各中文内容表（ESSENCE/QUOTE/CHIPS/判词/开场白等）建俄语版，按 locale 选取。

**AC:**
- 每张内容表有 ru 版，locale=ru 时取 ru。译文守 §8「真 vs 编」（不夸大/不编造负面）。
- **content-freshness 俄语强断言**：按天/按盘变化的内容在 ru 下相邻单元 `not.toBe`（登记到 `content-freshness.test.ts`，禁弱断言）。
- zh 内容逐字不变。
- Gate: tsc + vitest（含 ru freshness）全 exit=0。

---

## M4（parallel after M1 · P0 安全）: 危机检测俄语化

**Files:** Modify `web/src/lib/ai/safety.ts`（`CRISIS_PATTERNS_RU` + `CRISIS_RESPONSE_RU` + `detectCrisis(text, locale)`）、调用点 `chat/route.ts`、`narrative/route.ts`。Modify `safety.test.ts`。

**AC:**
- 俄语自杀/自残信号被 `detectCrisis(text,'ru')` 捕获（≥10 条 native 俄语危机表达测试用例，全部命中）；中英文回归不破。
- 命中 → 返回 `CRISIS_RESPONSE_RU`（含俄语热线指引）+ `crisis:true`，短路不喂 LLM。
- **宁可假阳性不可假阴性**：边界用例（含自杀词的非危机语境）允许误触发。
- Gate: tsc + vitest（含俄语 crisis 用例）全 exit=0。**此 milestone 是 §9 红线，必过。**

---

## M5（after M2–M4）: §8/§9 俄语 eval gate + rubric 登记

**Files:** Modify `web/src/lib/reading/calibrationEval.test.ts`（加俄语 charter 用例：真 vs 编、镜子非算命、不越权医疗）、新增俄语 §8/§9 eval 用例；Modify `docs/2026-06-16-constitution-eval-rubric.md`（加俄语评价条款）+ `docs/CONSTITUTION-CHANGELOG.md`（登记理由，过 constitution-gate）。

**AC:**
- 俄语解读样本过 §8 三亮线判据（不编造/操纵）+ §9（危机短路、敏感数据）。
- rubric 俄语条款已在 CHANGELOG 登记，`constitution-gate` CI 绿。
- 用强判据（交叉盘 + 关键词 + 必要时 LLM 判定），禁弱断言假绿灯。
- Gate: tsc + vitest 全 exit=0 + constitution-gate 绿。

---

## M6（serial · 收口）: 集成 + 全量 gate + PR

**AC:**
- 端到端：ru 请求 → 俄语解读（reading/chat/synastry/narrative/followups 全俄语，无中文残留）。
- locale-threaded guard 全量绿（无漏传）。
- **全量 gate**（PR 前强制，逐条 exit=0）：`cd web && bun run tsc --noEmit && bun run vitest run && bun run build && bun run test:e2e`。
- 延迟无明显回归。
- push + `gh pr create`。

---

## 验收（DoD for C）
- [ ] locale=ru 时 Molly 全程俄语（生成 + 确定性内容），zh 零回归。
- [ ] 俄语危机检测 native 校验通过（§9 P0）。
- [ ] §8/§9 俄语 eval 作 gate 且绿；rubric 改动已登记 CHANGELOG。
- [ ] locale-threaded guard 防漏传。
- [ ] 全量 gate 绿（带证据）+ PR 开出 + CI 全绿。
