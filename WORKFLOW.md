# WORKFLOW — astro-master 出码 gate

> 开工前必读。本文件是 `design/DESIGN-SYSTEM.md` §9–§12 的执行入口。
> 纯查询/研究/对话可不读；只要会动 `web/` 或 `design/` 的文件就必读。

## 动手前

1. 这是哪一类改动？（视觉打磨 / 新功能 / 修 bug / 数据&逻辑）
2. 它触碰的屏有没有「等待 / 异步 / 多态」？有 → 先抄出 §9 流程步骤清单。
3. 它对用户做了什么**能力宣称**？（会变准、双语、付费、社会证明数字…）→ 进 R4 对账。

## 六条铁律（详见 DESIGN-SYSTEM §10）

| 规则 | 一句话 | 防的 bug |
|---|---|---|
| **R1** | mockup 是视觉规格不是 DOM 规格 → 语义元素 + focus + aria-live + 表单语义 | div-onClick / 无 focus / 无 a11y |
| **R2** | 占位值不许变字面量 → 接真实数据源或留空 | 写死的 62% / 预填假日期 |
| **R3** | §9 升级为出码 gate → PR 列全状态 | 等待态/错误态漏实现 |
| **R4** | 能力宣称必须同 PR 兑现或撤回 | 假「越用越准」/ 双语没接 / 假数字 |
| **R5** | 领域真值先于美术 → 设计阶段自洽自查 | 猜的上升盖真值 / 定价没定先画 |
| **R6** | 变现/留存/病毒功能必须有常驻入口 | 财运/合盘只能靠卡片露出 |

## 出码前自检（贴进 PR 描述）

```
[状态清单 R3]   本屏 loading/empty/error/waiting：<位置 或 无需>
[宣称对账 R4]   新增/改动宣称：<逐条「已兑现:位置」或「已删」>
[a11y §11]      8 条逐项过（语义元素 / aria-label / focus / 表单 / aria-live / 非颜色 / reduced-motion / 触控≥44）
[测试]          typecheck=0 · vitest 全绿 · build 成功 · 相关 E2E 绿
```

## 测试命令

```bash
cd web
export PATH="/Users/ddd/.bun/bin:$PATH"
./node_modules/.bin/tsc --noEmit          # typecheck
./node_modules/.bin/vitest run            # 单测
./node_modules/.bin/next build            # 构建
./node_modules/.bin/playwright test       # E2E（funnel / PWA / settings）
```
