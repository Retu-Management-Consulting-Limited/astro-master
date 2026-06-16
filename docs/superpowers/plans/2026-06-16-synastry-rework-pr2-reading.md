# 合盘重做 · PR2 分型解读（Unit B + C）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans / subagent-driven-development. Steps use `- [ ]`.

**Goal:** 杀掉 5 类型共用的 mad-lib 合盘解读，换成 per-RelType 分型解读：① 确定性 scaffold（每类型独立 copy bank，即时 + fallback）；② LLM 实时生成（视角化，锚真实跨盘相位）；③ 客户端渐进升级 wrapper。纯数据层，不碰合盘页 UI（PR3 接入）。

**Architecture:** 复用 `/api/reading` 已在生产验证的模式——deterministic scaffold + LLM 换 prose + cacheSig + rate-limit + graceful fallback + logUsage。新增 3 处：`lib/reading/synastry.ts`（scaffold copy bank）、`app/api/synastry/reading/route.ts`（LLM 路由）、`lib/reading/remote.ts` 加 `fetchSynastryRead`。

**Tech Stack:** TypeScript · Vitest（含 `vi.mock` 隔离 LLM）· Next Route Handler

**上游：** spec `docs/superpowers/specs/2026-06-16-synastry-rework-design.md` Unit B/C；决策 D1（视角化）、D5（文案再狠，守 §8.1/§10）。

**测试前置：** `cd web && export PATH="/Users/ddd/.bun/bin:$PATH"`

---

## Task 1：`synScaffold()` —— per-RelType 确定性分型解读（杀 mad-lib）

**Files:** Create `web/src/lib/reading/synastry.ts` + `web/src/lib/reading/synastry.test.ts`

- [ ] **Step 1: 失败测试** —— 见 `synastry.test.ts`（断言每类型 catchLine 不同、含 hi/lo 维度名、输出无 emoji 前缀、纯函数确定性）。
- [ ] **Step 2: 跑确认失败**（模块不存在）。
- [ ] **Step 3: 实装 `synScaffold(result, selfName?, otherName?)`**：BANK 按 RelType 提供 `vibe/body/catchLine` 模板，取最高/最低维度填充。catchLine 走 D5 狠路线但每条点到能动（§10）。
- [ ] **Step 4: 跑确认通过。**
- [ ] **Step 5: 提交。**

## Task 2：`/api/synastry/reading` LLM 路由（视角化 + cache + fallback）

**Files:** Create `web/src/app/api/synastry/reading/route.ts` + `route.test.ts`

- [ ] **Step 1: 失败测试**（`vi.mock("@/lib/ai/llm")` 隔离 LLM；断言成功路径返回 vibe/body/catchLine、失败路径优雅回退到 per-type scaffold（`fallback:true`，且不同类型文案不同）、非法盘/坏类型 400、同 key 二次命中 cache 不再调 LLM）。
- [ ] **Step 2: 跑确认失败。**
- [ ] **Step 3: 实装路由**：`synastry(selfChart, otherChart, type)`（self 永远是 a 侧 → "你的"=self，"对方的"=other，视角化对 A/B 都成立）；prompt 喂双盘 `facts()` + 真实跨盘相位（禁编造）；输出 JSON `{vibe,body,catchLine}`；cacheKey `syn:type:selfSig:otherSig`；rate-limit `RULES.reading()`；`logUsage({route:"synastry"})`；catch → scaffold。
- [ ] **Step 4: 跑确认通过。**
- [ ] **Step 5: typecheck + 提交。**

## Task 3：客户端 `fetchSynastryRead` + 渐进升级 wrapper

**Files:** Modify `web/src/lib/reading/remote.ts`

- [ ] **Step 1: 实装 `fetchSynastryRead(selfChart, otherChart, type, selfName?, otherName?)`**：`AI_ON` gate；POST `/api/synastry/reading`；形状校验失败/超时/AI-off → null（调用方用 scaffold）。
- [ ] **Step 2: typecheck + 提交。**（无独立单测——纯 fetch wrapper，与现有 `fetchThemeRead` 同构；route 已测）

## Task 4：动态内容契约登记（R14/R15 硬 gate）

**Files:** Modify `web/src/__guards__/content-freshness.test.ts`

- [ ] **Step 1: 加 freshness 块**：`synScaffold` —— 相邻 RelType（同一对盘）文案 `not.toBe`；不同配对（同类型）文案 `not.toBe`。强断言，禁 `Set().size`。
- [ ] **Step 2: 跑确认通过 + 提交。**

## Task 5：收口 —— 全量 + build

- [ ] vitest 全绿 · tsc=0 · next build 成功 · 出码自检贴 PR。

---

## 自检
- Unit B → Task 2；Unit C → Task 3；杀 mad-lib（per-type scaffold）→ Task 1 + Task 2 fallback；R14 登记 → Task 4。
- 类型一致：`SynRead {vibe,body,catchLine}`（Task 1 定义）贯穿 route/remote/guard。
- LLM 不在单测里真调：Task 2 用 `vi.mock`。
- 不碰 `synastry/page.tsx`（UI 接入留 PR3）——本 PR 纯数据层，独立可测可合。
