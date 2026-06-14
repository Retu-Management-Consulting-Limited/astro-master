# 设计 Spec：反馈驱动的自迭代管线（feedback-loop）

**日期**：2026-06-14
**项目**：astro-master（Molly / vapeincity.com）
**状态**：待 Kevin 审核
**作者**：Claude（经与 Kevin 头脑风暴定稿）

---

## 1. 目标（一句话）

每小时自动从线上后台收集内测用户反馈，对每条**可执行、在范围内**的反馈，自动设计 → 改码 → 跑测试 → 开 PR + Vercel 预览，并邮件通知 Kevin；Kevin 在手机 GitHub App 上点一下 Merge 即上生产。形成一个**人工只保留最后一道 merge 闸门**的自迭代闭环。

---

## 2. 已锁定的决定（头脑风暴结论）

| 维度 | 决定 | 理由 |
|---|---|---|
| 自动化程度 | 全自动到 **PR + Vercel preview**，Kevin 一键 merge 才上生产 | 99% 自动 + 1 个安全闸门；AI 改动绝不无人审上活站 |
| 改动范围 | **文案 + 视觉/样式/小交互**；不碰新功能、后端逻辑、架构 | 范围越窄越可靠；靠 e2e 截图回归兜底 |
| 触发条件 | **每条可执行反馈各开一个 PR**（带去重） | 响应快；用幂等去重防止同反馈刷 PR |
| 交付方式 | **GitHub repo + 连 Vercel**（真 PR + 自动 preview，merge→自动上生产） | 最干净的「一键放行」 |
| 运行位置 | **Claude Code 远端定时 agent（云）**，每小时 | 无人值守，不依赖 Kevin 笔记本 |
| 通知 | **邮件** kevinx@retuhk.com | |
| 承重内容 | **无硬禁改区**，但碰到承重内容打**软标记** `⚠️` | 人工 merge 闸门已是真正安全网；软标记给闸门加仪表盘，不改变 Kevin 的选择 |
| 手机放行 | **方案 A：GitHub 手机 App**（点预览→点 Merge） | 能在真机先看到改动再放行 |

---

## 3. 管线（7 阶段）

```
每小时 (Claude 远端 cron)
  1. 拉反馈   GET /api/admin/export (Authorization header；非 URL，避免凭据入日志)
             → 与「已处理反馈清单」diff，只留新反馈
  2. 判定     LLM 对每条新反馈打分：可执行? 在范围内(文案/视觉)? 去重(同主题是否已有开放 PR)?
             → 不可执行/超范围/重复 → 记录原因(不静默丢)，跳过
  3. 设计     对每条过关反馈：最小改动方案 + 验收标准(AC)
  4. 改码     新分支 feedback/<id>-<slug>；改动文件限定 web/，仅文案+样式+小交互
  5. 测试     typecheck + vitest + playwright e2e(含截图回归) → 必须全绿
             → 任一失败 → 关分支、记录、不开 PR(绝不带病提交)
  6. 开 PR    push 分支 → gh 开 PR(标题含反馈摘要+AC；承重内容打 ⚠️)
             → Vercel 自动 build preview URL
  7. 通知     邮件给 Kevin：反馈原文 + 改了啥 + AC + [看预览] + [去 PR merge]
  └─ Kevin 在 GitHub App 点 Merge → Vercel 自动上生产
```

---

## 4. 硬不变量（绝不破坏）

1. **绝不直接动 `main`，绝不直接 `vercel --prod`。** 唯一上生产路径 = Kevin merge PR（Vercel 的 GitHub 集成自动部署 main → prod）。
2. **测试不全绿就不开 PR。** 第 5 阶段是硬闸。
3. **幂等。** 每条反馈有稳定 id；已处理/已开 PR 的不重复处理。cron 重跑、补跑都安全。状态存在一个 `processed feedback` 记录里（KV 或仓库内 `.feedback-loop/processed.json`）。
4. **范围锁。** 改动文件限定 `web/`；diff 经 LLM 自检「只含文案/样式/小交互」，越界 → 自动降级为「只发建议邮件，不开 PR」。
5. **承重内容软标记。** 命中清单（付费墙/价格、隐私/账号/合规、AI 揭露声明、出生数据处理、核心计算逻辑）→ PR 与邮件打 `⚠️ 触及承重内容，请重点审`。不拦截，只提示。

---

## 5. 基础设施

### 5.1 GitHub
- astro-master 当前为纯本地 git（`main` 分支，无远端）。需：建 GitHub repo（建议 private）、`git push -u origin main`。
- 远端 agent / CI 需要 `gh`（或 GitHub API token）以开 PR。

### 5.2 Vercel
- 现为本地 `vercel --prod` 部署，项目 `kevin-retu-s-projects/web`，Root Directory = `web`。
- 需：在 Vercel 连接该 GitHub repo → 打开 Git 集成。效果：
  - 每个 PR 分支 → 自动 **Preview** 部署（给 Kevin 手机看）。
  - merge 到 `main` → 自动 **Production** 部署（替代手动 `vercel --prod`）。

### 5.3 密钥（agent/CI 需要，存 GitHub Secrets / Claude 远端 secret store，绝不入库）
- `ANTHROPIC_API_KEY`（判定 + 改码用，模型见 §7）
- `ADMIN_SECRET`（读 `/api/admin/export`）
- `GITHUB_TOKEN`（push + 开 PR）
- 邮件发信凭据（见 §6）
- 生产域：`https://vapeincity.com`

### 5.4 运行位置（含载荷假设）
- **首选**：Claude Code 远端定时 routine（cloud），每小时。
- **⚠️ 载荷假设（实现第一步必须验证）**：远端 routine 的 sandbox 能否真的 `git push` 到 GitHub + `gh` 开 PR，尚未验证。
  - **能** → 按首选走。
  - **不能** → 自动回退 **GitHub Actions 定时 workflow**（`schedule: cron` 每小时，CI 内跑 Claude → push 分支 → 开 PR）。效果等价、更稳，cron 住在仓库里。
- 实现时先做最小 spike 验证此假设，不假设成立往下盖楼。

---

## 6. 邮件通知（每个 PR 一封）

- 收件人：kevinx@retuhk.com
- 标题：`[Molly 自迭代] <反馈摘要>`，承重内容前缀 `⚠️`
- 正文：反馈原文 → 改了啥(自然语言 diff 摘要) → 验收标准 AC → 两个大按钮 `[看预览]`(Vercel preview URL) `[去 PR merge]`(GitHub PR URL)
- 发信方式：优先复用现有渠道（Gmail MCP / 或 Vercel 侧已有发信能力）。**实现时确认发信通道，不假设。**

---

## 7. 成本与模型

- 判定/分类（第 2 阶段，高频、低难度）：用便宜档（haiku）打底。
- 设计+改码（第 3–4 阶段，仅在有过关反馈时触发，低频）：用 sonnet。
- 内测期反馈量小（5–10 人），多数小时第 1 阶段拉完即「无新反馈」直接结束，成本极低。
- 加一条日志：每次 run 记录「拉到 N 条 / 过关 M 条 / 开 PR K 个 / 跳过原因」。

---

## 8. 手机放行流程（方案 A）

一次性：手机装 GitHub App，登录。之后每个 PR：
1. 邮件点 `[看预览]` → Safari 打开 Vercel 预览站，真机看改动。
2. 邮件点 `[去 PR merge]` → 跳 GitHub App 的该 PR，划一下看 diff。
3. 点绿色 `Merge pull request` → Vercel 自动上生产，约 1–2 分钟生效。

---

## 9. 失败与边界处理

| 情形 | 处理 |
|---|---|
| 某小时无新反馈 | 第 1 阶段后即结束，不开 PR，不发邮件（或只发极简心跳日志，可配） |
| 反馈不可执行/超范围 | 记录原因，跳过；不开 PR |
| 测试失败 | 关分支，记录失败原因；可选：发一封「这条反馈尝试失败」告知邮件 |
| 同主题已有开放 PR | 去重跳过，不重复开 |
| LLM 判定改动越界（碰后端/新功能） | 降级为「只发建议邮件」，不开 PR |
| 远端 agent 不能 push/PR | 回退 GitHub Actions（§5.4） |
| 反馈含恶意/注入内容 | LLM 判定阶段过滤；且人工 merge 闸门兜底——任何改动都需 Kevin 点 merge |

---

## 10. 验收标准（这个系统本身怎么算建成）

1. 建好 GitHub repo + Vercel Git 集成；push 一个测试分支能自动出 preview URL；merge 能自动上生产。✅ 可演示
2. 跑一次管线（用一条人造反馈），能走完「拉→判定→改码→测试绿→开 PR→preview→邮件」全链，邮件里两个按钮都可点。✅ 可演示
3. 幂等验证：同一条反馈连跑两次 cron，第二次不重复开 PR。✅ 可演示
4. 范围锁验证：喂一条「加个新功能」类反馈，系统降级为建议邮件而非开越界 PR。✅ 可演示
5. 测试闸验证：人为让改动测试失败，系统不开 PR。✅ 可演示
6. 远端 cron 每小时自动触发（或回退方案）。✅ 可演示

---

## 11. 不做（YAGNI / 明确排除）

- 不做自动 merge（人工闸门是核心，不去掉）。
- 不做新功能/新页面/后端逻辑的自动改动（超范围）。
- 不做硬禁改区（Kevin 选「无硬禁改区」；以软标记替代）。
- 不做多 PR 自动合并/冲突自动解决（冲突就让 Kevin 在 GitHub 上处理）。
