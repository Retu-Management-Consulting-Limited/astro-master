# Molly · 看穿你的本命

AI 西洋占星本命盘 · 中文 H5 mobile web app（消费级产品）。双语 i18n 规划中（next-intl 已装，英文 UI 未上线）。

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

## 部署 + 5–10 人内测（Vercel + Upstash）

云上**用 API key**(不是订阅:订阅不能部署、且不许给真实用户服务)。代码已就绪:`runLLM` 见 key 自动走 API;Agent SDK 改为**惰性 import**(没 key 永不加载,serverless 包保持精简);缓存/测试者数据落 KV。

**你来 provision(我无法用你的账号代做)：**
1. **Anthropic API key** — console.anthropic.com → 一个 key。
2. **Vercel 项目** — import 这个 repo(Root Directory 设 `web`)。
3. **Upstash Redis**(免费档)— Vercel Marketplace 加 KV,或 upstash.com 建库。

**Vercel 环境变量：**
```
ANTHROPIC_API_KEY=sk-ant-...        # 必须:走 API、快、合规
MOLLY_MODEL=sonnet                  # 可选 haiku|sonnet|opus
NEXT_PUBLIC_MOLLY_AI=1              # 开真解读
NEXT_PUBLIC_MOLLY_TEST=1           # 开内测埋点 + 反馈按钮
ADMIN_SECRET=<长随机串>             # 看数据用
# KV：Vercel KV 会自动注入 KV_REST_API_URL/TOKEN;
#     用 Upstash 独立库则填 UPSTASH_REDIS_REST_URL/TOKEN
```

**内测能力(均 env-gated,关了就没有)：**
- 每访客一个 httpOnly `mid` cookie(`src/proxy.ts`)→ 服务端归因,无需前端感知
- 埋点:`activated`(完成激活,带昵称+上升)/ `theme_view` / `chat_send` / `share` / `feedback`
- 右下角浮动**反馈按钮** → 一句话反馈(带页面+testerId)
- 看数据:`GET /api/admin/export?secret=ADMIN_SECRET` → 全部 tester/事件/反馈 JSON
- 缓存 + 数据走 KV(跨重启、多实例共享)

**给测试者**:发 Vercel 的网址即可,提醒「首读约 3 秒、右下角随手反馈」。

## 设计来源

- 主纲：`../docs/2026-06-12-product-design-spec.md`
- 设计系统 + 出屏自查：`../design/DESIGN-SYSTEM.md`
- 17 张 hi-fi 屏：`../design/*.html`
