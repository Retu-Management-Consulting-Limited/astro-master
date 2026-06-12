# Molly · 全功能 App 建造计画（Plan→Code→Test）

> **日期**：2026-06-13
> **范围**：全功能 app（激活峰 + 每日仪式 + 自我模型 + 财运 + 合盘 + 金句卡 + 历史/我眼中的你）
> **AI/付费**：一律 stub（确定性占位），真 Claude key / geocoding / DB / 部署后插
> **栈**：Next.js(App Router)+TS+Tailwind+Bun · astronomy-engine · next-intl · Vitest + Playwright
> **依据**：[主 spec](2026-06-12-product-design-spec.md) · [设计系统](../design/DESIGN-SYSTEM.md) · `design/*.html` hi-fi
> **位置**：`astro-master/web/`

---

## 工作纪律
- TDD：纯逻辑（排盘/校准/亮点/财运分级/合盘分数）先写测试再实作。
- UI：照 `design/*.html` hi-fi + DESIGN-SYSTEM token，1:1 还原。
- 频繁 commit（每个可用单元一次）。
- 每阶段末跑测试 + E2E + 起 dev server 验证。
- 缺凭证 → stub，接口留好，标 `TODO(key)`。

## 阶段

### P0 · 基础（foundation）
- 脚手架 Next + Tailwind + src/app。
- 把 DESIGN-SYSTEM 色票/字体/动效落成 Tailwind theme + globals.css；接 Google Fonts（Cormorant/Hanken/Noto）。
- i18n（next-intl）：zh 默认 + en 就绪，文案 key 化。
- 共用组件：`<PhoneFrame>`、`<CosmicEye>`(大/mini)、`<StarField>`、`<GoldButton>`、`<Card>`、`<TabBar>`、reveal 动效 hook。
- 测试：组件渲染 smoke test。

### P1 · 排盘引擎 + 亮点偵測（核心纯逻辑，TDD）
- `lib/astro/chart.ts`：astronomy-engine 包装 → 10 行星+四角+凯龙/北交/莉莉丝、Placidus、5 主相位。输入 {date,time,lat,lng,tz}。
- `lib/astro/geocode.ts`：内嵌城市表 stub（城市→lat/lng/tz）。
- `lib/astro/highlights.ts`：亮点偵測（按相位紧密度/角度/stellium 排序，取前 5）。
- `lib/astro/calibration.ts`：校准小测 → 上升候选收窄。
- 测试：已知出生数据 → 期望行星位置/上升（容差内）；亮点排序；校准收窄。

### P2 · 激活峰漏斗（端到端第一闭环）
- `lib/reading/generate.ts`：首读生成**接口** + **stub**（按 highlights + 痛域模板出确定性首读，设计准确）。`TODO(key)` 接 Claude。
- 屏（照 hi-fi）：landing / input / calibration / loading / first-read / register / today-shell。
- 路由 + 漏斗状态（zustand 或 URL/server）+ gated→register 触发 + PWA manifest/SW 壳。
- E2E：Playwright 走 落地→今日 全程，断言首读出现、注册、落地今日。

### P3 · 四 tab + 每日仪式 + 自我模型(轻)
- 今日（昨/今/明 + 心情打卡 + 懂你度 + 财运 chip）；行运引擎 stub（transits 计算或占位）。
- 本命/盘面（SVG 高亮驱动）+ 主题深度解读。
- 对话（chat UI + stub 回复 + 记忆回放 stub）。
- 我的（首页 + 我眼中的你 + 历史 + 卡片）+ 设置（AI 揭露/数据可删）。
- 自我模型：事件流 + 轻量画像 stub（本地存）。
- 测试：每日内容生成、tab 导航 E2E。

### P4 · 财运 + 合盘 + 金句卡
- 财运日历（绿白红分级逻辑 TDD + 月历 UI + 今/慎文案 + 黄金日）。
- 合盘（多维分数按关系类型 TDD + 选类型/发邀请(share)/等待/结果 + 邀请链接路由）。
- 金句卡（canvas/SVG 出图 + 主题×元素配图库 + 分享）。
- 历史/我眼中的你 真数据接自我模型。
- 测试：财运分级、合盘分数、合盘邀请 E2E。

### P5 · 收尾
- 错误/空/loading 态全接。
- 全量 Playwright E2E 跑绿。
- 起 dev server，preview 实走所有主流程，截图存证。
- README + 环境变量清单（key/geocode/db 待填）。

## Stub 清单（待真接）
- 🔑 Claude API（首读/对话/合盘/财运文案生成）
- 🌍 geocoding + 历史时区（生产 API）
- 🗄️ DB / 账户 / 自我模型持久化（现本地）
- 💳 Stripe（变现 defer）· 📨 Email/WebPush（召回）· ☁️ Vercel 部署
