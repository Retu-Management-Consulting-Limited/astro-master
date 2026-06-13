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

## 还没接的（stub）

代码里用 `TODO(key)` / `TODO(geo)` / `TODO(push)` / `TODO(invite)` / `TODO(obs)` 标注。
当前所有 AI 解读是**确定性 stub**（编织真实星位），接入 Claude 后替换文案、保留结构：

| 标记 | 位置 | 接什么 |
|---|---|---|
| `TODO(key)` | `lib/reading/generate.ts`、`theme.ts`、`app/chat` | Claude 解读（建议走 server route，密钥不进客户端） |
| `TODO(geo)` | `lib/astro/geocode.ts` | 真实地理编码 + 历史时区（现为内置城市表） |
| `TODO(push)` | `app/me/settings` | Web Push 订阅（每日星象 / 财运 / 合盘提醒） |
| `TODO(invite)` | `app/synastry` | 合盘邀请链接 → 对方真实出生数据 |
| `TODO(font-embed)` | `lib/share/card.ts` | 金句卡 PNG 嵌入品牌衬线字体（导出避免 canvas 跨域污染，现用通用 serif） |

### 接 Claude 时

```bash
cp .env.example .env.local      # 填 ANTHROPIC_API_KEY
```

解读应走 **server route / server action**（`claude-opus-4-8` 或同档），不要把密钥放进客户端 bundle。
生成时以「真实星盘 + 累积 self-model」为条件，沿用各 stub 的输出结构（`FirstRead` / `ThemeRead`）。

## 设计来源

- 主纲：`../docs/2026-06-12-product-design-spec.md`
- 设计系统 + 出屏自查：`../design/DESIGN-SYSTEM.md`
- 17 张 hi-fi 屏：`../design/*.html`
