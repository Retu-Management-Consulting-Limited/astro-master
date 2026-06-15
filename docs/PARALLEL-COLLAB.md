# 并行协作规约（多 agent / 多 session 同时改 Molly）

> 背景：两个写手共用一个工作树 + 一条可改写的分支，没有隔离/集成闸门，导致过：
> ① 半成品状态把 build 弄红（understanding.ts）② `reset/rebase` 冲掉别人的 commit（40e80b8 丢失）③ 同文件互相覆盖。
> 一劳永逸 = **隔离 + 只进不改写的集成 + 自动绿灯闸门**，三件套缺一不可。

## 1. 隔离：一个 workstream 一个 worktree + 一条分支
不同 agent/session **不共用工作目录**：

```bash
# 从仓库根创建独立工作树 + 分支（与主树共享 .git，互不踩文件）
git worktree add ../molly-<name> -b feat/<name>
# 完事后清理
git worktree remove ../molly-<name>
```

- Claude 的 Agent/Workflow 工具：spawn 时带 `isolation: "worktree"`，自动隔离。
- 物理隔离后，mid-edit 不可能互相覆盖；各自在自己分支提交。

## 2. 集成只「进」不「改写」：PR 合并，永不 rebase/reset 共享分支
- `main` **只接受 PR / merge**，只快进或合并提交。
- **绝不** 对 `main`（或别人正在用的分支）`git reset --hard` / `git rebase` / 强推。要同步别人的改动：`git pull --no-rebase`（合并，不改写）。
- pre-push hook（见下）会**自动拒绝**非快进推送，把误改写挡在本地。
- 建议在 GitHub 开启 `main` 分支保护：require PR + require status checks（CI）+ 禁止 force-push。

## 3. 自动绿灯闸门：合并前必须全绿
- CI（`.github/workflows/ci.yml`）：每个 PR 跑 `tsc --noEmit` + `vitest run` + `next build`（+ playwright e2e）。**红的不准合**。
- 半成品 / 类型错 / 崩构建 进不了 main。

## 一次性启用（每个 clone 跑一次，worktree 间共享）

```bash
git config core.hooksPath .githooks    # 启用 pre-push 保护
chmod +x .githooks/pre-push
```

GitHub 上把 CI 设为 required check（Settings → Branches → main → Require status checks）。

## 软分工（可选，减少撞车）
按区域大致认领，尽量别同时改同一文件：
- 服务端/数据层：`web/src/lib/server/*`、`web/src/app/api/*`
- 前端/页面：`web/src/app/**/page.tsx`、`web/src/components/*`
- 占星/纯逻辑：`web/src/lib/astro/*`、`web/src/lib/reading/*`

如需强制，加 `CODEOWNERS`。

## TL;DR
1. 各开各的 worktree+分支（隔离）。
2. 只用 PR 合 main，**永不改写共享历史**（hook 已强制）。
3. CI 全绿才合（闸门已配）。
