# Molly · 看穿你的本命

AI 西洋占星本命盘 · 双语 H5 mobile web app（消费级产品）。

> 独立个人项目，与 RETU 无关。详见上层 `../CLAUDE.md`。

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**，**Bun** 运行时
- **Tailwind 4**（CSS `@theme`）+ 设计系统 token 在 `src/app/globals.css`
- **astronomy-engine**（MIT）— 客户端排盘（黄道经度 / ASC·MC / 宫位）
- **zustand + persist** — 漏斗状态，持久化到 localStorage（PWA 冷启动保活）
- **PWA** — `app/manifest.ts` + `public/sw.js`（离线壳）+ 安装引导
- 测试：**Vitest**（纯逻辑单测）+ **Playwright**（端到端漏斗）

## 跑起来

```bash
bun install
bun run dev          # → http://localhost:3000  （launch.json 名称: molly-web）
bun run build        # 生产构建（18 路由）
```

## 测试

```bash
bun run typecheck                      # 或 ./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run         # 26 单测：排盘 / 亮点 / 财运 / 合盘 / 金句卡 / 主题
./node_modules/.bin/playwright test    # 3 E2E：激活漏斗 / PWA 安装 / 设置·删数据
```

E2E 注入 CSS 关掉动画、隐藏 Next dev 指示器与安装条，避免点击稳定性误判。

## 架构

```
src/
  app/
    page.tsx          落地 → input → calibration → reading → register   ← 激活漏斗
    today|chart|chat|me/        主 4 tab（chart-guard 守卫）
    wealth/  synastry/  share/  theme/[id]/  history/  me/settings/
    not-found.tsx  error.tsx    404 / 错误边界
    manifest.ts                 PWA manifest
  lib/
    astro/   chart.ts(排盘) geocode.ts highlights.ts wealth.ts synastry.ts
    reading/ generate.ts(初读) theme.ts(主题深读)
    share/   card.ts(金句卡 SVG→PNG)
    store.ts(zustand persist)  guard.ts(rehydrate 后才重定向)  relationship.ts
  components/  CosmicEye  TabBar  LoadingRitual  InstallPrompt  StoreHydration
```

排盘、亮点、财运、合盘、主题解读全部是**纯函数 + 真实星体位置**，有单测覆盖。

## 真大师解读 + 对话（Molly AI）

两个 route 用**同一套**后端（`lib/ai/llm.ts` 的 `runLLM` + `lib/ai/molly.ts` 的人设/星盘事实）：

- **`app/api/reading`** — 首读 + 主题深读。Claude 只写**文案**，星位由真实星盘确定性算好传进去（绝不让模型编星位）。前端**渐进增强**：先秒出 stub，AI 回来**原地替换**。带按星盘签名的有界缓存（同盘重复读秒回、不再计费）。
- **`app/api/chat`** — Molly 实时对话，条件是她的星盘 + 对话历史。前端有「正在想…」指示，失败回退到脚本回复。

**自动选后端**（`runLLM`）：

| 环境 | 走哪条 | 速度 |
|---|---|---|
| `ANTHROPIC_API_KEY` 已设 | 直连 `@anthropic-ai/sdk` API | ~2–5s（生产） |
| 未设 | Agent SDK 复用本机 **Claude Code 订阅登录** | ~40–90s（本地 pilot） |

- **开关**：`.env.local` 里 `NEXT_PUBLIC_MOLLY_AI=1`（不设=纯 stub / 脚本回复，测试/CI 即此）
- **模型**：`MOLLY_MODEL=haiku|sonnet|opus`（默认 sonnet）。SDK 路径已 `settingSources:[] / mcpServers:{} / cwd=tmpdir` 跳过工作区配置，两路都接了 `abortController`（客户端断开即中止）。

> ⚠️ **订阅鉴权仅限本地 pilot**。Anthropic 不允许用 claude.ai 登录给产品的终端用户服务；有真实用户前填 `ANTHROPIC_API_KEY` 即自动切到 API（也快很多），**别的不用改**。
>
> ⏱️ Agent SDK 每次冷启动引擎子进程（~40–90s，不是模型慢）。pilot 自测够用（stub/脚本秒出、后台替换）。

## 还没接的（stub）

代码里用 `TODO(geo)` / `TODO(push)` / `TODO(invite)` / `TODO(font-embed)` 标注。

| 标记 | 位置 | 接什么 |
|---|---|---|
| `TODO(geo)` | `lib/astro/geocode.ts` | 真实地理编码 + 历史时区（现为内置城市表） |
| `TODO(push)` | `app/me/settings` | Web Push 订阅（每日星象 / 财运 / 合盘提醒） |
| `TODO(invite)` | `app/synastry` | 合盘邀请链接 → 对方真实出生数据 |
| `TODO(font-embed)` | `lib/share/card.ts` | 金句卡 PNG 嵌入品牌衬线字体（导出避免 canvas 跨域污染，现用通用 serif） |

readings 仍保留确定性 stub 作为**即时兜底**（AI 关闭、超时或失败时用）。

## 设计来源

- 主纲：`../docs/2026-06-12-product-design-spec.md`
- 设计系统 + 出屏自查：`../design/DESIGN-SYSTEM.md`
- 17 张 hi-fi 屏：`../design/*.html`
