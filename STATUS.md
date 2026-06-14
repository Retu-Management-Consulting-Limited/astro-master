# Molly — 项目状态 (STATUS)

> 快照日期：2026-06-14 · 代码在 `web/` · 设计在 `design/` · 文档在 `docs/`
> 一句话状态：**已部署上云,5–10 人内测可跑(真大师 AI + 埋点/反馈落 KV)。真用户前还差账号体系等(见 §7)。**

---

## 0. 线上 / 内测部署（current）

- **线上地址(发测试者)**：**https://vapeincity.com**(+ www;Vercel 默认域 https://web-beige-psi-kre97cof9a.vercel.app 仍可用)
- **平台**：Vercel,项目 `kevin-retu-s-projects/web`(Root Directory = `web`),`vercel --prod` 部署
- **自定义域名**：vapeincity.com — nameserver 已指向 Vercel(ns1/ns2.vercel-dns.com),apex + www 已配 SSL,验证通过
- **AI 后端**：直连 Anthropic API(`ANTHROPIC_API_KEY` 已设)→ sonnet,~10s/次(渐进 UX 遮住:stub 秒出、后台替换)。换 `MOLLY_MODEL=haiku` 可约减半。
- **存储**：Upstash 免费 Redis(REST),已连并验证跨请求持久化。缓存 + 测试者/事件/反馈都在。
- **看数据**：`<线上地址>/api/admin/export?secret=<ADMIN_SECRET>`
- **Vercel 生产 env 清单**(值不入库)：`ANTHROPIC_API_KEY`、`MOLLY_MODEL=sonnet`、`NEXT_PUBLIC_MOLLY_AI=1`、`NEXT_PUBLIC_MOLLY_TEST=1`、`ADMIN_SECRET`、`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`
- **密钥位置**：`ADMIN_SECRET` 等真实值在 `web/.env.production`(**gitignored,不入库**);Vercel 里是加密存的。
- **改 env 后必须 `vercel --prod` 重发才生效。**
- **注意**：验证时注入过一条测试数据(tester「云测A」+ `kv-test-…` 反馈),看 export 时忽略。

> 真大师 AI 现走 API(合规、可部署)。`@anthropic-ai/claude-agent-sdk` 的订阅路径仅本地 `bun run dev` 不设 key 时用;云上靠惰性 import 不打包。

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
| ~~`TODO(geo)`~~ ✅ 已接 | `lib/astro/geo/` + `api/geocode` | 离线 GeoNames 双语库(3.3万城)+ Nominatim 兜底；出生当刻历史/DST offset 用 native Intl 算(中国 86-91 DST、分数时区全对) |
| `TODO(push)` | `app/me/settings` | Web Push 订阅(每日星象/财运/合盘提醒) |
| `TODO(invite)` | `app/synastry` | 合盘邀请链接 → 对方真实出生数据 |
| `TODO(font-embed)` | `lib/share/card.ts` | 金句卡 PNG 嵌品牌衬线字体(现用通用 serif 避免 canvas 跨域污染) |
| `TODO(key)` | `app/theme/[id]`,`lib/astro/wealth.ts` | 主题付费深读 / 更丰富的财运模型 + 文案 |
| `TODO(obs)` | `app/error.tsx` | 错误上报(Sentry) |

---

## 7. 内测 / 上线 checklist（按优先级）

**内测就绪 —— 已全部完成 ✅（见 §0）**
- [x] `runLLM` 见 `ANTHROPIC_API_KEY` 自动走 API;Agent SDK 改惰性 import(serverless 包精简)
- [x] 缓存 + 测试者数据/事件/反馈 → env-gated KV(已接 Upstash 免费 Redis)
- [x] 测试者 cookie(`src/proxy.ts`)+ 埋点(`/api/event`)+ 反馈(`/api/feedback`)+ 导出(`/api/admin/export`),均 `NEXT_PUBLIC_MOLLY_TEST` 门控
- [x] 已部署 Vercel production,API/KV/埋点/反馈线上验证通过 → **可发测试者**

**真上线（阻断,内测之后）**
- [x] `TODO(geo)` 真实地理编码 + 历史时区 —— 离线 GeoNames 双语库 + Nominatim 兜底；offset 按出生当刻算(DST/历史/分数全对)；7 条验收 live 通过
- [x] 真实账号体系 —— 邮箱/密码(scrypt)+ 服务端 KV 用户/会话(httpOnly cookie,可撤销)；盘/firstRead/昵称落服务端;跨设备登录恢复;保留 guest 低摩擦入口。单测+路由+playwright+裸 HTTP 全绿
- [~] 隐私合规：删除已接服务端(account delete);**导出仍为本地 JSON**、邮箱未验证邮件 → 余项见 §6 `TODO`/账号 spec §5

**强烈建议**
- [x] AI 内容审核 / 兜底 —— 危机短路(确定性,显式自伤信号→核实过的热线,不调 AI)+ SAFETY 系统条款 + 失败兜底(reading 回 stub、chat 回安全句,均非 500)。spec `2026-06-14-launch-guardrails-design.md`
- [x] 限流 + 成本监控 —— 按身份(user/cookie/IP)固定窗口:读 30/天(超→发 stub 不阻断)、聊 60/时·300/天(超→429);成本按天聚合 tokens/分模型/估算$→ admin export。28 新测全绿、危机短路 live 验证
- [ ] `TODO(push)` Web Push(留存核心:每日提醒)
- [ ] `TODO(invite)` 合盘邀请(病毒增长)
- [ ] `TODO(obs)` 错误上报
- [ ] 部署目标确认(Vercel 注意 serverless `maxDuration`;若仍用 SDK 路径会超时——再次提示:生产走 API)

**下一步 · 已设计待实现（⏸️ Kevin 2026-06-14 暂缓）**
- [ ] **反馈驱动自迭代管线（feedback-loop）** — 每小时 GitHub Actions 拉内测反馈 → 双轨：范围内文案/视觉自动开 PR（Kevin 手机 merge 上生产）+ 超范围高价值反馈聚合成分拣摘要邮件。设计＋三轮完整性复核已定稿，**实现按下不表**。**捡起看**：`docs/superpowers/specs/2026-06-14-feedback-loop-self-iteration-design.md` §13 实现待办。**硬前置**：先确认「上线护栏」workstream 已提交。

**打磨**
- [ ] `TODO(font-embed)` 金句卡品牌字体(分享物料质感)
- [ ] `TODO(key)` 主题付费深读(变现)+ 财运模型加厚
- [ ] i18n 接线(next-intl 已装,英文未接)

**未来 / 扩张（近期不做，目标人群仍为海外华人女性）**
- [ ] `TODO(persona-gender)` 填资料时加「性别」字段。**女性 → 维持现有 Molly 这套**（亲密、被看穿，已打磨）；**男性 → 另一套语气与主题**（更偏方向/事业/关系，去掉女性向措辞与「她」代词）。
      触及面：input 采集 → funnel store → 账号 profile → [molly.ts](web/src/lib/ai/molly.ts) PERSONA + reading/chat prompt（现「她」为硬编码）。为「扩到全体海外华人、重点仍女性」的解锁项，按分群个性化而非中性化。

---

## 8. 失败风险（来自早期 brainstorm,留作提醒）

1. **准度感知**：Molly「越用越准」是留存命门——校准回路要真的反馈到解读(现 self-model 是 stub)。
2. **延迟**:见 §4,上线必须 API。
3. **AI 失控**:消费级 + 情绪脆弱用户,内容安全比通用产品更敏感。
4. **合规**:出生数据是个人敏感信息;设置页已有 AI 揭露 + 数据权,后端要真正兑现。

---

_构建历程见 git log（P0 脚手架 → P6e 慢路径动画）。设计主纲 `docs/2026-06-12-product-design-spec.md`;运行说明 `web/README.md`。_
