# Molly — 项目状态 (STATUS)

> 快照日期：2026-06-13 · 代码在 `web/` · 设计在 `design/` · 文档在 `docs/`
> 这份文件给「下次接着干 / 交给协作者」用。一句话状态：**功能全闭环，本地 pilot 可跑真大师 AI（借订阅），上线前需切 API key。**

---

## 1. 它是什么

Molly · 看穿你的本命 —— AI 西洋占星本命盘,双语 H5 mobile web app,消费级产品。
独立个人项目,与 RETU 无关(详见 `CLAUDE.md`)。beachhead：海外华人女性(小红书)。

技术栈：Next.js 16 (App Router) + React 19 + TS + Bun;Tailwind 4;astronomy-engine 客户端排盘;zustand+persist;PWA;Vitest + Playwright。

---

## 2. 功能面（全部已实现并测过）

| 屏 / 功能 | 路由 | 状态 |
|---|---|---|
| 落地 → 输入 → 校准 → 首读 → 注册 | `/`,`/input`,`/calibration`,`/reading`,`/register` | ✅ 激活漏斗 |
| 今日(三句话 + 财运 chip) | `/today` | ✅ |
| 本命盘(真实星体 + 亮点 + 主题入口) | `/chart` | ✅ |
| 主题深读(感情/财富/孤独/自我) | `/theme/[id]` | ✅ 编织真实星位 |
| 对话(Molly 实时回应) | `/chat` | ✅ |
| 我的 | `/me` | ✅ |
| 财运日历(逐日评分 + 黄金日) | `/wealth` | ✅ |
| 合盘(5 种关系,多维契合) | `/synastry` | ✅ |
| 金句卡(可下载 PNG) | `/share` | ✅ 病毒钩子 |
| 历史回看(诚实的 day-1 时间线) | `/history` | ✅ |
| 设置(AI 揭露 + 数据导出/删除) | `/me/settings` | ✅ 产品责任 |
| 404 / 错误边界 | `not-found.tsx` `error.tsx` | ✅ |
| PWA(manifest + SW 离线壳 + 安装引导) | `manifest.ts` `public/sw.js` | ✅ 留存基石 |

**纯逻辑全部 TDD**：排盘 / 亮点 / 财运 / 合盘 / 金句卡 / 主题(26 单测)。

---

## 3. AI 架构

三处解读共用**一套后端**：`lib/ai/llm.ts`(runner)+ `lib/ai/molly.ts`(人设 + 星盘事实序列化)。

- **`/api/reading`** — 首读 + 主题深读。Claude 只写**文案**,星位由真实星盘确定性算好传进去(模型不许编星位)。按星盘签名的**有界 LRU 缓存**(同盘重复读秒回、不再计费)。
- **`/api/chat`** — 实时对话,条件 = 星盘 + 最近 12 轮对话。

**双路自动切换**(`runLLM` 看 `ANTHROPIC_API_KEY`)：

| 环境 | 后端 | 速度 |
|---|---|---|
| key 已设 | 直连 `@anthropic-ai/sdk` API | ~2–5s（生产） |
| key 未设 | Agent SDK 复用本机 Claude Code 订阅登录 | ~40–90s（本地 pilot） |

**前端体验（渐进增强 + 慢路径动画）**：
1. 先秒出确定性 stub(永不卡流程,也是 AI 失败/关闭时的兜底)
2. `MollyThinking` 动画：呼吸的宇宙之眼 + 轮播**个性化**思考语(贴你的月亮星座)+ 跳动小点
3. 超时安抚：38s/72s 叠加安抚文案,把"慢"框成"她在认真读你"
4. AI 回来后**原地替换** stub

开关：`.env.local` 里 `NEXT_PUBLIC_MOLLY_AI=1`(不设 = 纯 stub/脚本,测试即此)。模型：`MOLLY_MODEL=haiku|sonnet|opus`(默认 sonnet)。

---

## 4. 延迟取舍（重要）

- Agent SDK **每次冷启动一个引擎子进程**,单次 ~40–90s（不是模型慢,是 SDK 不为快速 completion 设计）。standalone ~42s,dev route ~90s。
- 这对 **pilot 自测文案**完全够用(stub 秒出 + 动画 + 后台替换),**不适合真实用户**。
- 切到 API key 后是 ~2–5s,**零代码改动**(`runLLM` 自动选)。
- ⚠️ **订阅鉴权只能本地 pilot**：Anthropic 不允许用 claude.ai 登录给产品终端用户服务。有真实用户前必须用 `ANTHROPIC_API_KEY`。

---

## 5. 测试 / 构建（当前全绿）

```bash
cd web
bun run typecheck          # tsc --noEmit, clean
./node_modules/.bin/vitest run        # 26 单测
./node_modules/.bin/playwright test   # 3 E2E（激活漏斗 / PWA安装 / 设置·删数据）
bun run build              # 18 路由 + /api/reading + /api/chat
```

注：E2E 在 AI=on 下跑(渐进设计让断言落在秒出的 stub 上)。冒烟测试**不主动触发**第二个并发 SDK 调用,避免子进程争抢拖慢。

---

## 6. 还没接的 stub

| 标记 | 位置 | 接什么 |
|---|---|---|
| `TODO(geo)` | `lib/astro/geocode.ts` | 真实地理编码 + 历史时区(现为内置城市表) |
| `TODO(push)` | `app/me/settings` | Web Push 订阅(每日星象/财运/合盘提醒) |
| `TODO(invite)` | `app/synastry` | 合盘邀请链接 → 对方真实出生数据 |
| `TODO(font-embed)` | `lib/share/card.ts` | 金句卡 PNG 嵌品牌衬线字体(现用通用 serif 避免 canvas 跨域污染) |
| `TODO(key)` | `app/theme/[id]`,`lib/astro/wealth.ts` | 主题付费深读 / 更丰富的财运模型 + 文案 |
| `TODO(obs)` | `app/error.tsx` | 错误上报(Sentry) |

---

## 7. 上线前 checklist（按优先级）

**必须（阻断上线）**
- [ ] 配 `ANTHROPIC_API_KEY`,确认 `/api/reading` `/api/chat` 走 API 且 ~2–5s
- [ ] 缓存升级到跨进程(Redis/KV)——现为内存 Map,重启即清、多实例不共享(`/api/reading` 的 `CACHE`)
- [ ] `TODO(geo)` 真实地理编码 + 历史时区(否则非内置城市的盘会错)
- [ ] 真实账号体系(注册现为 stub,无邮箱/密码;数据现仅存 localStorage)
- [ ] 隐私合规：数据存储落地 + 设置页「导出/删除」对接真实后端(现为本地)

**强烈建议**
- [ ] AI 内容审核 / 兜底(防 Claude 偶发离谱输出伤到用户)
- [ ] 限流 + 成本监控(按用户/按盘),用便宜档(haiku)打底
- [ ] `TODO(push)` Web Push(留存核心:每日提醒)
- [ ] `TODO(invite)` 合盘邀请(病毒增长)
- [ ] `TODO(obs)` 错误上报
- [ ] 部署目标确认(Vercel 注意 serverless `maxDuration`;若仍用 SDK 路径会超时——再次提示:生产走 API)

**打磨**
- [ ] `TODO(font-embed)` 金句卡品牌字体(分享物料质感)
- [ ] `TODO(key)` 主题付费深读(变现)+ 财运模型加厚
- [ ] i18n 接线(next-intl 已装,英文未接)

---

## 8. 失败风险（来自早期 brainstorm,留作提醒）

1. **准度感知**：Molly「越用越准」是留存命门——校准回路要真的反馈到解读(现 self-model 是 stub)。
2. **延迟**:见 §4,上线必须 API。
3. **AI 失控**:消费级 + 情绪脆弱用户,内容安全比通用产品更敏感。
4. **合规**:出生数据是个人敏感信息;设置页已有 AI 揭露 + 数据权,后端要真正兑现。

---

_构建历程见 git log（P0 脚手架 → P6e 慢路径动画）。设计主纲 `docs/2026-06-12-product-design-spec.md`;运行说明 `web/README.md`。_
