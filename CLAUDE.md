# CLAUDE.md — astro-master（星盘大师 / Molly）

## 项目身份（重要）

- **这是一个独立的个人项目**：星盘大师 / Molly —— AI 西洋占星本命盘、中文 H5 mobile web app（双语 i18n 规划中，英文 UI 未上线）。
- **与 RETU 完全无关**。它恰好放在 `~/Documents/Claude/` 这个 RETU 工作区目录下，但它是一个独立 git repo，**不属于 RETU 工作区的任何子项目**。
- **用户在本项目中不是 CCO、不是合规角色**。不要用「你是 CCO」「你本行」「RETU 合规框架」等方式给建议。这是一个消费级产品项目，用产品/增长/工程的语言讨论。
- 隐私/数据保护仍是正常的产品设计考量（消费级 app 处理个人数据），但**作为普通产品责任**对待，不挂靠 RETU 或 CCO 身份。

## 设计文档

完整设计见 `docs/`，主纲：`docs/2026-06-12-product-design-spec.md`。设计系统与出屏自查见 `design/DESIGN-SYSTEM.md`。

## 工作规约（House rules）

- **出屏前跑 Flow-Completeness 自查**（详见 `design/DESIGN-SYSTEM.md §9`）：① 拿屏对照 spec 列的每一步（每步必有屏或标「无需屏」）② 端到端走一遍、给每个过渡命名触发动作（每屏答「怎么来+怎么走」，过渡没承接屏=漏屏）③ 多角色流程每个角色各走完整路径 ④ 别只做「英雄屏」，发送/分享/确认/loading/empty/error 最易漏。**只做目的地、漏掉路径，是反复出现的 bug——这条是 gate。**
- **对自己的产出跑因果/机制自查**：流畅 ≠ 正确；越完整越要抽查一条承重假设（与上条同源，一管机制、一管流程完整性）。
- **动态内容契约 + 测目标别测代理**（R14–R15，详见 `design/DESIGN-SYSTEM.md §15`）：① 凡「按天 / 按用户盘 / 按配对」变化的内容，**选择粒度必须细到沿那条轴产生可感变化**——值会变 ≠ 呈现会变，验呈现层（按天的相邻日必不同，个性化的不同盘必不同）。② 修 X 求 Y 时测 **Y 本身**，不测代理；变化类断言用**最强形式**（相邻单元 `not.toBe`），**禁止** `Set(...).size>1` 这种弱断言（它是假绿灯）。新增动态面必须在 `web/src/__guards__/content-freshness.test.ts` 登记强断言。

## ⚠️ 并行协作硬规则（多 agent / 多 session 必读，这是 gate 不是建议）

只要会动到本 repo 的文件，**开工前必须**遵守以下三件套（完整版见 `docs/PARALLEL-COLLAB.md`）。这些已由机器强制（GitHub 分支保护 + CI + pre-push hook），违反会被**直接拒绝**——别浪费一轮去试。

1. **隔离**：一个 workstream 一个 worktree + 一条分支，**不共用工作目录**。Agent/Workflow 工具 spawn 时带 `isolation: "worktree"`；手动则 `git worktree add ../molly-<name> -b feat/<name>`。共用工作树会在文件层互相覆盖（分支保护管不着）。
2. **只进不改写**：`main` **只接受 PR**，**绝不** 对 `main` 或别人在用的分支 `reset --hard` / `rebase` / force-push。同步别人改动用 `git pull --no-rebase`。服务端已禁直推/强推/删 main（含管理员）。
3. **CI 绿才合**：每个 PR 必过 `tsc --noEmit` + `vitest run` + `next build` + playwright e2e（required checks），红的合不进去。

新 clone 一次性启用本地拦截：`git config core.hooksPath .githooks`（`web` 里 `bun install` 会自动执行，无需手动）。
