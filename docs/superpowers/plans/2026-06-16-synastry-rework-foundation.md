# 合盘重做 · 地基实施计划（PR1 引擎 + PR1.5 服务端）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为合盘重做铺地基——① 引擎 `synastry()` 暴露每个维度的真实跨盘相位（维度下钻的数据源）；② invite 服务端存/回 A 的派生盘 + 关系类型（B 端看合盘 + 类型传递的承重前置）。两者纯逻辑/数据层，不碰 UI，独立可测可合。

**Architecture:** PR1 在 `lib/astro/synastry.ts` 新增 `dimAspects()`，与现有 `dimScore()` 并列——**完全不动评分公式**，只把已算的中间量吐出来，保 30 条 baseline 不破。PR1.5 在 `synastry-invite.ts` + invite 路由把 `inviterChart`/`type` 设为**可选**字段（非破坏性，先于 A 端改动合并）；守 §9.3——只存/回派生 chart，不碰原始 birthForm。

**Tech Stack:** TypeScript · Vitest · Next.js Route Handlers · PGlite/KV store（既有）

**上游 spec：** `docs/superpowers/specs/2026-06-16-synastry-rework-design.md`（Unit A + Unit H 服务端 + PR1/PR1.5）

**测试前置（每次跑测试先设 PATH）：**
```bash
cd web
export PATH="/Users/ddd/.bun/bin:$PATH"
```

---

## Task 1：引擎类型 —— 定义 `SynAspect`，给 `SynDim` 加 `aspects`

**Files:**
- Modify: `web/src/lib/astro/synastry.ts:5-14`（`SynDim` / `SynResult` 类型区）

- [ ] **Step 1: 写失败测试**

在 `web/src/lib/astro/synastry.test.ts` 末尾追加：

```ts
import type { SynAspect } from "./synastry";

describe("synastry exposes per-dim cross-aspects (Unit A)", () => {
  it("every dim has an aspects array", () => {
    const r = synastry(a, b, "lover");
    for (const d of r.dims) {
      expect(Array.isArray(d.aspects)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `./node_modules/.bin/vitest run src/lib/astro/synastry.test.ts -t "every dim has an aspects array"`
Expected: FAIL —— `d.aspects` 是 undefined（`Array.isArray(undefined)===false`），且 TS 报 `SynAspect` 不存在。

- [ ] **Step 3: 加类型（暂返回空数组让测试过）**

`synastry.ts` 把类型区改为：

```ts
export interface SynDim {
  key: string;
  label: string;
  value: number; // 0..100
  aspects: SynAspect[];
}
export interface SynAspect {
  a: BodyName;      // A 方的星
  b: BodyName;      // B 方的星
  angle: number;    // 命中的相位角：0 / 60 / 90 / 120 / 180
  kind: "harmony" | "tension";
  strength: number; // 0..1
}
export interface SynResult {
  type: RelType;
  total: number;
  dims: SynDim[];
}
```

`synastry()` 暂时给每个 dim 填空数组（下一个 task 实装）：

```ts
export function synastry(a: Chart, b: Chart, type: RelType): SynResult {
  const dims = CONFIG[type].map((d) => ({ key: d.key, label: d.label, value: dimScore(a, b, d.pairs, d.mode), aspects: [] as SynAspect[] }));
  const total = Math.round(dims.reduce((s, d) => s + d.value, 0) / dims.length);
  return { type, total, dims };
}
```

- [ ] **Step 4: 跑测试确认通过 + 全量 baseline 不破**

Run: `./node_modules/.bin/vitest run src/lib/astro/synastry.test.ts`
Expected: PASS（含原有全部 baseline 用例）。

- [ ] **Step 5: 提交**

```bash
git add web/src/lib/astro/synastry.ts web/src/lib/astro/synastry.test.ts
git commit -m "feat(synastry): SynAspect type + aspects field on SynDim (Unit A scaffold)"
```

---

## Task 2：`dimAspects()` —— 收集真实跨盘相位（全部命中，按 strength 降序）

**Files:**
- Modify: `web/src/lib/astro/synastry.ts`（新增 `nearest()` + `dimAspects()`，接进 `synastry()`）
- Test: `web/src/lib/astro/synastry.test.ts`

- [ ] **Step 1: 写失败测试**

追加到 `synastry.test.ts`：

```ts
describe("dimAspects content (Unit A · D6 全部命中)", () => {
  it("aspects are sorted by strength desc, valid kind/angle, real bodies", () => {
    const r = synastry(a, b, "lover");
    const all = r.dims.flatMap((d) => d.aspects);
    expect(all.length).toBeGreaterThan(0); // 这两个测试盘至少命中一条
    for (const asp of all) {
      expect([0, 60, 90, 120, 180]).toContain(asp.angle);
      expect(["harmony", "tension"]).toContain(asp.kind);
      expect(asp.strength).toBeGreaterThan(0);
      expect(asp.strength).toBeLessThanOrEqual(1);
      expect(typeof asp.a).toBe("string");
      expect(typeof asp.b).toBe("string");
    }
    // 每个维度内部按 strength 降序
    for (const d of r.dims) {
      const s = d.aspects.map((x) => x.strength);
      expect(s).toEqual([...s].sort((p, q) => q - p));
    }
  });

  it("same-body pairs (Moon-Moon) are not double-counted", () => {
    // safety 维含 ["Moon","Moon"]：同星对只算一个方向，不应出现 a===b 且重复的两条
    const safety = synastry(a, b, "lover").dims.find((d) => d.key === "safety")!;
    const moonMoon = safety.aspects.filter((x) => x.a === "Moon" && x.b === "Moon");
    expect(moonMoon.length).toBeLessThanOrEqual(1);
  });

  it("does NOT change baseline scores (value/total untouched)", () => {
    // 评分公式不动：抽样断言一个确定值与重算一致
    const r1 = synastry(a, b, "lover");
    const r2 = synastry(a, b, "lover");
    expect(r1.total).toBe(r2.total);
    expect(r1.dims.map((d) => d.value)).toEqual(r2.dims.map((d) => d.value));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `./node_modules/.bin/vitest run src/lib/astro/synastry.test.ts -t "dimAspects content"`
Expected: FAIL —— `all.length` 为 0（aspects 还是空数组）。

- [ ] **Step 3: 实装 `nearest()` + `dimAspects()`**

在 `synastry.ts` 的 `near()` 之后新增（**不改 `dimScore()`**）：

```ts
// Like near(), but also returns WHICH target was hit — so dimAspects can label
// the aspect. Returns strength 0 when outside orb.
function nearest(angle: number, targets: number[], orb = 8): { target: number; strength: number } {
  let best = { target: targets[0], strength: 0 };
  for (const t of targets) {
    const o = Math.abs(angle - t);
    if (o <= orb) {
      const s = 1 - o / orb;
      if (s > best.strength) best = { target: t, strength: s };
    }
  }
  return best;
}

// Surface the real cross-aspects behind each dimension's score. Pure read of the
// same separations dimScore() uses — the score formula is NOT touched. Returns
// every aspect within orb (D6: no top-N cap; orb naturally bounds it), strongest
// first. `a`=A-side body, `b`=B-side body.
function dimAspects(a: Chart, b: Chart, pairs: Pair[]): SynAspect[] {
  const out: SynAspect[] = [];
  for (const [x, y] of pairs) {
    // same-body pair (e.g. Moon-Moon): only one meaningful direction
    const dirs: [BodyName, BodyName, number][] = x === y
      ? [[x, y, sep(lon(a, x), lon(b, y))]]
      : [[x, y, sep(lon(a, x), lon(b, y))], [y, x, sep(lon(a, y), lon(b, x))]];
    for (const [pa, pb, s] of dirs) {
      const h = nearest(s, [0, 60, 120]);
      const t = nearest(s, [90, 180]);
      const dom = h.strength >= t.strength
        ? { target: h.target, strength: h.strength, kind: "harmony" as const }
        : { target: t.target, strength: t.strength, kind: "tension" as const };
      if (dom.strength > 0) out.push({ a: pa, b: pb, angle: dom.target, kind: dom.kind, strength: dom.strength });
    }
  }
  return out.sort((p, q) => q.strength - p.strength);
}
```

把 `synastry()` 里的 `aspects: [] as SynAspect[]` 换成实算：

```ts
    aspects: dimAspects(a, b, d.pairs),
```

- [ ] **Step 4: 跑测试确认通过 + 全量绿**

Run: `./node_modules/.bin/vitest run src/lib/astro/synastry.test.ts`
Expected: PASS（含 30 条 baseline + 新增 aspects 用例）。

- [ ] **Step 5: typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: 退出码 0，无输出。

- [ ] **Step 6: 提交**

```bash
git add web/src/lib/astro/synastry.ts web/src/lib/astro/synastry.test.ts
git commit -m "feat(synastry): dimAspects() exposes real cross-aspects per dim (Unit A, D6)"
```

---

## Task 3：服务端数据模型 —— invite 存 `inviterChart` + `type`（可选，非破坏性）

**Files:**
- Modify: `web/src/lib/server/synastry-invite.ts:10-28`
- Test: `web/src/lib/server/synastry-invite.test.ts`

- [ ] **Step 1: 写失败测试**

追加到 `synastry-invite.test.ts`（沿用文件现有的 import / KV 套路；若文件用了 `beforeEach` 清 KV，保持一致）：

```ts
import type { RelType } from "@/lib/astro/synastry";

describe("invite stores inviter chart + type (PR1.5)", () => {
  it("createInvite persists inviterChart and type, getInvite returns them", async () => {
    const fakeChart = { placements: [], ascSign: "Aries" }; // 占位：本测试只验存取，不验盘有效性
    const token = await createInvite("Kevin", fakeChart, "lover" as RelType);
    const inv = await getInvite(token);
    expect(inv?.inviterName).toBe("Kevin");
    expect(inv?.inviterChart).toEqual(fakeChart);
    expect(inv?.type).toBe("lover");
  });

  it("createInvite still works with no chart/type (backward compatible)", async () => {
    const token = await createInvite("Solo");
    const inv = await getInvite(token);
    expect(inv?.inviterName).toBe("Solo");
    expect(inv?.inviterChart ?? null).toBeNull();
    expect(inv?.type ?? null).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `./node_modules/.bin/vitest run src/lib/server/synastry-invite.test.ts -t "invite stores inviter chart"`
Expected: FAIL —— TS 报 `createInvite` 只接 1 个参数 / `Invite` 无 `inviterChart`。

- [ ] **Step 3: 改数据模型**

`synastry-invite.ts` 改 `Invite` 接口与 `createInvite`：

```ts
import type { RelType } from "@/lib/astro/synastry";

export interface Invite {
  inviterName?: string;
  inviterChart?: unknown; // A 的计算后盘（派生，非 birthForm）——供 B 端看合盘
  type?: RelType;         // A 选的关系类型，随邀请传给 B
  createdAt: number;
  partner: Partner | null;
}

export async function createInvite(inviterName?: string, inviterChart?: unknown, type?: RelType): Promise<string> {
  const token = randomBytes(12).toString("hex");
  const invite: Invite = {
    inviterName: inviterName?.slice(0, 40),
    inviterChart,
    type,
    createdAt: Date.now(),
    partner: null,
  };
  await (await getKV()).set(key(token), invite);
  return token;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `./node_modules/.bin/vitest run src/lib/server/synastry-invite.test.ts`
Expected: PASS（含原有 invite 用例）。

- [ ] **Step 5: 提交**

```bash
git add web/src/lib/server/synastry-invite.ts web/src/lib/server/synastry-invite.test.ts
git commit -m "feat(synastry-invite): persist inviterChart + type, optional & backward-compatible (PR1.5)"
```

---

## Task 4：invite 路由 —— POST 收 `inviterChart`/`type`，GET 回它们（守 §9.3）

**Files:**
- Modify: `web/src/app/api/synastry/invite/route.ts`
- Test: `web/src/app/api/synastry/invite/route.test.ts`

- [ ] **Step 1: 写失败测试**

追加到 `route.test.ts`（沿用文件现有的 POST/GET 调用套路）：

```ts
import { computeChart } from "@/lib/astro/chart";

describe("invite route carries chart + type (PR1.5)", () => {
  it("POST accepts inviterChart+type; GET returns them; never returns inviter birthForm", async () => {
    const chart = computeChart({ year: 1990, month: 5, day: 1, hour: 10, minute: 0, lat: 22.3, lng: 114.2, tz: 8 });
    const postRes = await POST(new Request("http://t/api/synastry/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviterName: "Kevin", inviterChart: chart, type: "lover" }),
    }));
    const { token } = await postRes.json();
    expect(typeof token).toBe("string");

    const getRes = await GET(new Request(`http://t/api/synastry/invite?token=${token}`));
    const j = await getRes.json();
    expect(j.type).toBe("lover");
    expect(j.inviterChart?.placements?.length).toBeGreaterThan(0);
    expect("inviterBirthForm" in j).toBe(false); // §9.3：绝不回原始出生表单
  });

  it("POST rejects a structurally invalid inviterChart", async () => {
    const res = await POST(new Request("http://t/api/synastry/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviterName: "X", inviterChart: {}, type: "lover" }),
    }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `./node_modules/.bin/vitest run "src/app/api/synastry/invite/route.test.ts" -t "carries chart + type"`
Expected: FAIL —— GET 返回的 `j.type` 是 undefined；非法盘那条没 400。

- [ ] **Step 3: 改路由**

`invite/route.ts` 改 POST（加 chart/type 解析 + 校验）与 GET（回 chart/type）：

```ts
import { NextResponse } from "next/server";
import { createInvite, getInvite } from "@/lib/server/synastry-invite";
import { resolveIdentity } from "@/lib/server/identity";
import { rateLimit, RULES } from "@/lib/server/ratelimit";
import { isFullChart } from "@/lib/astro/chart-validate";
import type { RelType } from "@/lib/astro/synastry";

export const runtime = "nodejs";

const REL_TYPES: RelType[] = ["lover", "partner", "colleague", "friend", "family"];

export async function POST(req: Request) {
  const rl = await rateLimit(await resolveIdentity(req), RULES.invite());
  if (!rl.ok) return NextResponse.json({ error: "创建太频繁，请稍后再试" }, { status: 429, headers: rl.retryAfterSec ? { "retry-after": String(rl.retryAfterSec) } : undefined });

  let body: { inviterName?: unknown; inviterChart?: unknown; type?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* optional body */
  }
  // inviterChart/type are optional (A-side sends them once D3 lands). If a chart
  // IS provided it must be structurally valid — a junk chart would crash B-5.
  if (body.inviterChart !== undefined && !isFullChart(body.inviterChart)) {
    return NextResponse.json({ error: "invalid chart" }, { status: 400 });
  }
  const type = REL_TYPES.includes(body.type as RelType) ? (body.type as RelType) : undefined;
  const token = await createInvite(
    typeof body.inviterName === "string" ? body.inviterName : undefined,
    body.inviterChart,
    type,
  );
  return NextResponse.json({ token });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const invite = await getInvite(token);
  if (!invite) return NextResponse.json({ error: "invite not found" }, { status: 404 });
  // §9.3: expose only DERIVED charts (placements), never raw birthForm — for
  // either side. partner.chart and inviterChart are derived; birthForm stays server-only.
  const partner = invite.partner ? { name: invite.partner.name ?? null, chart: invite.partner.chart } : null;
  return NextResponse.json({
    inviterName: invite.inviterName ?? null,
    inviterChart: invite.inviterChart ?? null,
    type: invite.type ?? null,
    ready: !!invite.partner,
    partner,
  });
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `./node_modules/.bin/vitest run "src/app/api/synastry/invite/route.test.ts"`
Expected: PASS（含原有 route 用例）。

- [ ] **Step 5: typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: 退出码 0。

- [ ] **Step 6: 提交**

```bash
git add web/src/app/api/synastry/invite/route.ts web/src/app/api/synastry/invite/route.test.ts
git commit -m "feat(synastry-invite): route carries inviterChart+type, derived-only per §9.3 (PR1.5)"
```

---

## Task 5：地基收口 —— 全量回归 + build

**Files:** 无新增

- [ ] **Step 1: 全量单测**

Run: `./node_modules/.bin/vitest run`
Expected: 全绿（尤其 `synastry`、`synastry-invite`、invite route）。

- [ ] **Step 2: typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: 退出码 0。

- [ ] **Step 3: build**

Run: `./node_modules/.bin/next build`
Expected: 构建成功。

- [ ] **Step 4: 出码前自检（贴进 PR 描述）**

```
[状态清单 R3]   纯逻辑/数据层，无 UI 屏 → 无需
[宣称对账 R4]   无新增用户可见宣称（地基层）→ 无
[亮线 §8/§9.3]  GET 只回派生 chart，birthForm 不外泄：route.test.ts「never returns inviter birthForm」
[测试]          vitest 全绿 · tsc=0 · next build 成功
[baseline]      synastry 30 条 value/total 不变（未动评分公式）
```

---

## 自检（writing-plans self-review）

- **Spec 覆盖**：Unit A → Task 1-2；Unit H 服务端承重（inviterChart/type）→ Task 3-4；§9.3 派生盘边界 → Task 4 GET + 测试。PR1/PR1.5 全覆盖。
- **类型一致**：`SynAspect`（Task 1）字段在 Task 2 `dimAspects` 一致使用；`createInvite(name, chart, type)` 签名 Task 3 定义、Task 4 调用一致；`REL_TYPES` 白名单与 `RelType` 一致。
- **非破坏性**：`inviterChart`/`type` 全程可选；现有 A 端 POST `{inviterName}` 仍合法（Task 3「backward compatible」用例守住）。
- **无占位符**：每步含真实代码与命令。
