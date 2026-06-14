# 设计文档 — Web Push 每日提醒 + 性别字段 + 财运模型加厚

> 日期：2026-06-14 · 项目：astro-master (Molly) · 自动执行（用户预授权 一条龙）
> 三个功能打一个 workstream，各自独立、各自 TDD。

## A. 财运模型加厚（纯逻辑，先做）

**现状**：`wealthScore` 只用「行运月亮」对本命木星/金星/土星的相位 → 每日噪声大、缺少多日「黄金期」结构。

**承重点**：财运的慢变量（机会窗口）来自慢行星，不是月亮。加一层**慢相位**：
- 行运木星/金星 → 本命金星、木星、以及 **2 宫主**（财帛）/ **8 宫主**（他人之财）。
- 月亮层保留为「当日触发」快变量；慢层提供跨多日的底色。
- 2 宫 = 上升起第 2 个整宫，8 宫 = 第 8 个；宫位星座的**传统主星**做落点。
- 输出仍 0–100；`wealthLevel` 阈值不变；`monthWealth`/golden 结构不变（不回归现有 4 测）。

新增纯函数：`signRuler(sign)`、`houseSign(ascSignIndex, n)`、慢层 `slowWealth(chart,date)`；合进 `wealthScore = clamp(50 + fast + slow)`。
测试：range 不变；新 helper 正确（白羊→火星、金牛→金星…；2/8 宫星座推导）；慢层使分数跨多日平滑（相邻日差异变小 / 出现连续旺期）；现有 4 测仍绿。

## B. 性别字段 + persona 分支

**现状**：prompt 硬编码「她」，女性向。`TODO(persona-gender)`。

**决策**：采集性别（女/男/不愿透露，默认女＝beachhead），让三处解读 prompt 按性别取**代词 + 语气**。女性维持现有 Molly（不动）；男性用平行变体（「他」视角，偏方向/行动/责任，去女性向措辞）。确定性 stub 文案本身基本中性，本期不改。

- `BirthForm` + `FunnelSnapshot` + 账号 profile 加 `gender?: "female"|"male"`（缺省按 female 处理）。
- `lib/ai/molly.ts`：`personaFor(gender)` 返回带代词/语气的 PERSONA；`facts` 不变。
- reading/chat 路由：body 收 `gender`，传入 prompt builder（firstPrompt/themePrompt/chatPrompt 的「她」参数化为 `ta`）。
- input 页 + /me/birth 页：加性别选择；reading/chat 客户端调用带上 gender。
- 测试：`personaFor("male")` 含「他」、不含女性向定式；`personaFor("female")`/缺省 == 现有；prompt builder 用对代词；路由透传 gender（mock llm 验证 system 含正确代词）。

## C. Web Push 每日提醒

**承重点 + 边界（诚实）**：真正「发出去」依赖 ① VAPID 私钥在 Vercel env、② 定时触发、③ iOS 需已安装 PWA + 16.4+ 且用户授权。我能完整做**订阅/退订/发送逻辑 + SW 处理 + cron 接线 + 全部 mock 测试**；**真机投递**需你配 env 后验证（标注）。

- 依赖 `web-push`（纯 JS，serverless 安全）。VAPID 密钥**构建期生成**：脚本 `scripts/gen-vapid.ts` 输出一对，公钥进 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`、私钥 `VAPID_PRIVATE_KEY`（你填 Vercel）。
- 存储：KV `push:subs`（set of endpoints）+ `pushsub:<id>`（订阅对象 + 身份 + 偏好）。
- 路由：
  - `POST /api/push/subscribe` {subscription, prefs} → 存。
  - `POST /api/push/unsubscribe` {endpoint} → 删。
  - `POST /api/push/send` （`?secret=PUSH_CRON_SECRET` 或 header 鉴权）→ 遍历订阅、web-push 发送；失效订阅(410/404)自动清理。
- SW（`public/sw.js`）：加 `push`（展示通知）+ `notificationclick`（聚焦/打开 `/today`）。
- 客户端：settings 的「每日星象提醒」开关接真订阅——开→请求权限+`pushManager.subscribe(VAPID)`→POST subscribe；关→unsubscribe。其余两个开关先共用 daily 订阅的偏好位。
- 定时：`vercel.json` `crons` 每日一次打 `/api/push/send`（带 secret）。
- 文案：cron 发送用**确定性**短句（不调 LLM，省成本）：如「Molly：今天有句话想单独跟你说 →」。
- 测试：subscribe/unsubscribe/send 路由（mock `web-push`，验证遍历+鉴权+410 清理）；KV 存取；SW 处理函数无法在 vitest 跑（标注，靠 build + 手动）。

## 验收
1. 财运：现有 4 测绿 + 新 helper/慢层测绿；分数仍 0–100；出现跨多日旺期。
2. 性别：male persona 用「他」、female 不变；prompt/路由透传正确（mock 验证）。
3. Push：subscribe→KV 有订阅；send（mock web-push）遍历并对 410 清理；未授权 secret 的 send→401/403；SW 含 push/notificationclick；vercel.json 有 cron。
4. 全量 tsc + vitest + build + playwright 全绿，无回归。
5. VAPID 密钥脚本可生成；交还 env 待办给用户。

---

## 实施结果（DELIVERED · 2026-06-14 存档）

三块全部实现、测试、提交：
- **财运加厚** `15ac9b2` — `wealth.ts`: `signRuler`/`houseSign`/`slowWealth`(行运木星·金星 → 本命金/木 + 2/8 宫主) 叠加在日月层之上；`wealthScore` clamp 0–100，旧 4 测不回归，新增 4 测。
- **性别 persona** `15ac9b2` — `molly.ts`: `personaFor(gender)`+`pronoun(gender)`+`PERSONA_MALE`；`store.ts` 加 `gender` 字段（snapshot/loadServer/partialize）；`remote.ts` 从 funnel 透传 gender；reading/chat 路由 system+prompt 全参数化；input + /me/birth 加「女/男」选择器；账号 Profile 加 gender。
- **Web Push** `34b76bc` — `web-push` 依赖；`scripts/gen-vapid.ts`；`push.ts`(KV 订阅/`sendToAll`/410 清理/防御过滤)+ KV `srem`；`api/push/{subscribe,unsubscribe,send}`(send 用 `PUSH_CRON_SECRET` 或 Vercel `CRON_SECRET` bearer 鉴权)；`public/sw.js` push+notificationclick；`push-client.ts`+settings 真订阅开关；`vercel.json` 每日 01:00 UTC cron。

**测试**：vitest 166（+24）｜ tsc 0 ｜ next build 0（push/synastry/geocode 路由全注册）｜ playwright 9/9 无回归。
机制自查修正：① reading 测试两图签名相同→缓存命中（用 distinctChart）；② `mockRejectedValue`/async-throw 触发 vitest 未处理拒绝误报（改 malformed-resolve）；③ push 路由测试 mock-bleed 第 4 次 undefined 调用 → `listSubscriptions` 防御过滤 malformed 记录 + 测试 mock guard。

**部署核实（2026-06-14，`web-beige-…vercel.app`）**：本轮代码已上线（push/synastry-invite/geocode 路由 live）。
**待办（交还 Kevin）**：
1. Vercel env：`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `PUSH_CRON_SECRET`（或 `CRON_SECRET`）→ 配后 `vercel --prod` 重发，推送客户端侧才激活（现 bundle 无公钥）。
2. **`vapeincity.com` 现为 Hostinger 停放页**，未指向 Vercel app（见 STATUS §0 警告）——需修复 DNS/域名绑定，否则发测试者的自定义域名打不开。
3. iOS 需「添加到主屏幕」+ 16.4+ 才能订阅。
