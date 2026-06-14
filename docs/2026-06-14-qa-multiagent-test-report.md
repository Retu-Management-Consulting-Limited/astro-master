# Molly — 多 Agent 真实测试者 浏览器全功能测试报告

> 日期：2026-06-14 · 方法：6 个 Playwright 驱动的 sub-agent 各扮一类真实测试者，在真实 headless Chromium（mobile 390×844，is_mobile/has_touch）端到端走完所有功能与状态。
> 环境：本地 `bun run dev` :3000，**STUB 模式（AI=off）**；生产 https://vapeincity.com 已授权但本轮未跑（见 §6）。
> 证据：截图 + `results.json` 全在 `/tmp/molly-test/{A1,A2,A3,A4,A5,A6}/`。

---

## 0. 一句话结论

激活漏斗、内容面、账号/隐私、变现/病毒、限流/admin **功能整体扎实**；但有 **2 个 P0（chat XSS + 危机短路被 AI 开关门控）** 和 **5 个 P1** 必须在发更多测试者前处理。STATUS 抬头「双语 H5」与实际「英文完全没做」不符（R4）。

---

## 1. 测试分工（6 人格 agent）

| Agent | 人格 | 覆盖 |
|---|---|---|
| A1 | 新用户（小红书来） | 激活漏斗 `/`→`/input`→`/calibration`→`/reading`→`/register`，输入校验、geocode、双语对账、gated 守卫 |
| A2 | 回访日常用户 | `/today` `/chart` `/theme/[id]`×4 `/history` `/me`、导航、刷新存活、数据真实性 |
| A3 | 倾诉型用户 | `/chat`、危机短路、XSS、边界输入、AI 失败兜底 |
| A4 | 分享型用户 | `/wealth` `/synastry`×5 关系、合盘邀请双角色全流程 + 对抗、`/share` PNG 下载 |
| A5 | 隐私敏感用户 | 注册/登录/登出、跨设备恢复、出生编辑重排盘、设置、导出、删除（破坏性） |
| A6 | 异常路径 | 404、error 边界、PWA/离线、限流打满、admin、API 入参校验 |

---

## 2. Bug 清单

### 🔴 P0（阻断 / 安全）

**P0-1 · Chat 反射型 XSS（生产同款代码）**
- 位置：`src/app/chat/page.tsx` ~L73 `dangerouslySetInnerHTML={{__html: m.text}}` 渲染**用户输入**。
- 复现：聊天发 `<img src=x onerror=alert(1)>BOLD<b>X</b>` → `alert(1)` 真触发，live `<img>`/`<b>` 注入 DOM。证据 `/tmp/molly-test/A3/probe_xss2.py`（`alert fired: True`）。
- 影响：现为 self-XSS；聊天若持久化/分享即升级为 stored-XSS（产品有「存成卡片」/分享面）。该文本还原样进 `/api/chat` 拼进 LLM prompt（route 只为危机正则 stripHtml，存储不脱）。
- 修：用户消息渲染为纯文本（不用 `dangerouslySetInnerHTML`）；HTML 渲染只留给可信的 Molly/recall 内容，或上 sanitizer。

**P0-2 · 危机短路被 AI 开关门控（AI=off 时安全网失效）**
- 位置：客户端 `src/app/chat/page.tsx` 把整个服务端调用包在 `if (AI_ON && chart)`；`detectCrisis` 只在服务端 `src/app/api/chat/route.ts`（grep 确认客户端零引用）。
- 复现：STUB 模式 `/chat` 发「我不想活了」→ 回轻佻占卜话「你这种问法本身就说明你已经知道答案了」，**从不调 /api/chat**，无热线。英文「I want to kill myself」同。证据 `/tmp/molly-test/A3/04-crisis-zh.png`。
- 现状：**生产 AI=on，真实用户目前受保护**——客户端会调 /api/chat，服务端 detectCrisis 先跑（A3 裸 POST 验证 ZH/EN/变体均 `crisis:true` + 核实热线：北京 010-82951332、HK Samaritans 2896 0000、US 988、AU Lifeline 13 11 14；「笑死/哈哈」正确不触发）。但**任何 AI=off 的部署 / fresh checkout / CI / AI 宕机降级**都裸奔。确定性安全检查不该依赖 AI 开关。
- 修：`detectCrisis` 移到客户端在分支决策前跑（或无条件 POST，让服务端危机检查先于一切）。该检查无 AI 依赖，没理由门控。

### 🟠 P1

**P1-1 · 刷新 /calibration 或 /reading 弹回 /input（rehydration 竞态）**
- 位置：`src/app/calibration/page.tsx:50-52`、`src/app/reading/page.tsx:22-26` 直接读 store 判 `if(!chart) replace("/input")`，未等 zustand `skipHydration` 手动 rehydrate（`src/lib/store.ts:69,79`）。首帧 chart=undefined → 误跳。
- 数据未丢（localStorage 仍有 chart），仅导航错。`/today`/`/chart` 用 `useChartGuard()`（等 `hasHydrated`）就没这问题。
- 修：calibration/reading 也用 `useChartGuard`。注意 calibration 还没持久化 `idx/picks`，修跳转后仍会从 Q1 重来。

**P1-2 · 合盘邀请 token 无「已用」守卫，可覆盖对方星盘**
- 位置：`src/lib/server/synastry-invite.ts` `setPartner()` 无条件覆盖 `invite.partner`，无 already-set 检查。
- 复现：recipient 提交一次（invite-done）后，重开同链接 → 表单重现且**可再次提交覆盖**。链接被转发→第三方可篡改 partner 数据。证据 `/tmp/molly-test/A4/04b-replay.png`。
- 修：token 首次提交后置为已消费态（再开显示已用/invite-invalid）。

**P1-3 · 无 key 时 SDK 子进程每请求冷启，压测拖死 dev server**
- 位置：`src/lib/ai/llm.ts` `viaSdk()`。无 `ANTHROPIC_API_KEY` 时每次 /api/chat、/api/reading 冷启一个 Agent SDK 子进程（~40–90s）。A6 压测第 1 次后 server 即 `ConnectionRefusedError` 死掉。
- 现实风险低（生产有 API key 走快路径，设任意 key 即 ~0.6s 快失败回 `{fallback:true}` 200），但缺并发护栏。
- 修：SDK 路径加并发上限/排队，或本地默认不走 SDK。

**P1-4 · /api/reading 对残缺 chart 返 500（空 body）**
- 位置：route 只校验 `chart?.placements` 真值；`generateFirstRead` 调 `find(chart,"Moon").sign`（无 Moon→TypeError），`detectHighlights` 遍历 `chart.aspects`（undefined→抛）。catch 里又调同一函数 → 二次抛 → 500。
- 复现：POST `{"chart":{"ascSign":"天蝎","placements":[{"body":"Sun",...}]}}` 或空 `placements:[]` → 500 空 body。真前端总传全 10 体 + `aspects:[]`，用户碰不到，但 API 不设防。
- 修：route 入参做完整性校验（10 体齐全 + aspects 数组），不齐返 400 或确定性 stub。

**P1-5 · 双语 中/EN 完全未实现（R4 宣称未兑现）**
- 全站无语言切换、无 i18n 代码、无英文文案（`next-intl` 已装但未接线）。但 STATUS §1 仍写「双语（中/英）H5」、CLAUDE.md 项目身份也写「双语」。
- 修：要么接 i18n 兑现双语，要么把对外文案/文档的「双语」宣称撤回，二选一（R4 铁律）。

### 🟡 P2

| # | 位置 | 问题 |
|---|---|---|
| P2-1 | `/chart` header (`chart/page.tsx:41`) | 硬编码「校准 78%」——唯一漏网占位（其余已换成 `understanding.ts` 真值）。改为计算值 |
| P2-2 | 全 gated 页 | 访客 `/api/auth/me` 401 被打成 console.error，每次导航刷红。401 应静默当匿名态 |
| P2-3 | `/wealth` (`wealth/page.tsx:62`) | 日格 `role=img` 无 onClick，点任意非今日格无反应；只有今日有详情卡 |
| P2-4 | `/share` | 下载按钮 testid 是 `save-btn`，与文档约定的 `save-card` 不一致（`save-card` 实际在 `/reading`）。对齐 testid |
| P2-5 | SW 注册 (`InstallPrompt.tsx`) | 离线壳被 `NODE_ENV!=='production'` 早返回禁用，仅 prod build 生效（设计如此，但 dev 无法验证离线，需 `next build && start`） |
| P2-6 | `/chat` | 快速双发：`typing` 守卫仅在 typing=true 时挡，stub ~500ms 落地后第二击会发出第二条。建议 typing 时禁用发送按钮 |
| P2-7 | admin | `/api/admin/login` 错密码 401，`/api/admin/export` 错 secret 403——状态码不一致（非 bug，可统一） |

---

## 3. 验证为真（R4 对账：宣称已兑现）

| 宣称 | 结论 | 证据 |
|---|---|---|
| 真实星体排盘 | ✅ 真 | 3 组不同生日得 3 张占星正确盘（广州→上升双子/☉狮子；北京→上升金牛/☉摩羯；墨尔本→上升摩羯/☉射手），`astronomy-engine` 真算 |
| 主题深读编织真实星位 | ✅ 真 | 4 主题各拉用户真实守护星宫位（如 ♀金星狮子·三宫） |
| 财运逐日评分数据驱动 | ✅ 真 | `wealth.ts` 按行运月亮对本命木/金（吉）vs 土（凶）谐波相位算；旺/平/慎分布 + 黄金日取 top-2 旺 |
| 诚实 day-1 历史 | ✅ 真 | 「我们，今天才刚认识」+ 真算懂你% + 前瞻承诺，不编造过去 |
| 跨设备恢复 | ✅ 真 | 清 localStorage+cookie 后 /today 弹回 /input，登录从服务端还原原始杭州盘 |
| 数据导出 | ✅ 真且完整 | 本地 JSON 含 birth（含解析后经纬/tz）+ chart（10 体+asc+mc+aspects）+ firstRead+nickname |
| 删除服务端兑现 | ✅ 真 | 删后 /api/auth/me 401、同邮箱登录失败（user+uemail 双键删）、gated 弹回；有 confirm 警告 |
| 危机热线 | ✅ 服务端真 | 见 P0-2，服务端分支正确（含核实热线）；问题在客户端门控 |
| 限流 | ✅ 真 | 聊第 61 次→429（retry-after），读第 31 次→200 stub 降级（不阻断），按身份 user>cookie>IP |
| admin 保护 | ✅ 真 | UI 登录门 + 错密码 401 / 错 secret 403，正确凭证才出数据 |
| PWA 离线机制 | ✅ 真（仅 prod build） | SW networkFirst + 预缓存 offline.html，手动注册后离线渲染品牌壳 |
| AI 揭露（设置页） | ✅ 真 | 「由 AI 驱动…不构成医疗/法律/投资建议…随时可删」 |
| 反欺骗：合盘 demo 模糊 | ✅ 真 | 默认示例分数模糊置于 connect CTA 后，用户不会把假分当真 |

**未在文案中宣称**（故无需兑现）：「越用越准」当前 UI/文案未出现（STATUS §8 自承 self-model 是 stub）。

---

## 4. 覆盖矩阵（路由 × 状态）

18 页面路由 + 16 API 全覆盖；每屏 loading/empty/error/waiting/多态均主动触发。

| 路由 | render | empty | error | 多态/waiting | 备注 |
|---|---|---|---|---|---|
| `/` | ✅ | — | — | — | |
| `/input` | ✅ | ✅(空提交校验) | ✅(garbage city geocode 404) | ✅(CN/EN 城市) | |
| `/calibration` | ✅ | — | — | 🐞 刷新弹回(P1-1) | |
| `/reading` | ✅ | — | ✅(残缺chart API 500, P1-4) | 🐞 刷新弹回(P1-1) | |
| `/register` | ✅ | ✅(空→auth-err) | ✅(坏邮箱/弱密码/409双击) | ✅(guest 路径) | |
| `/today` | ✅ | — | — | ✅(刷新稳定) | |
| `/chart` | ✅ | — | — | ✅(刷新存活) | 🐞 78% 硬编码(P2-1) |
| `/theme/[id]` ×4 | ✅ | ✅(garbage id 优雅 200) | — | ✅ | |
| `/chat` | ✅ | ✅(空发 no-op) | ✅(长/emoji/特殊) | ✅(thinking) | 🔴 XSS(P0-1) 🔴 危机门控(P0-2) |
| `/me` `/me/birth` | ✅ | — | ✅(坏城市 edit-err) | ✅(编辑重排盘) | |
| `/me/settings` | ✅ | — | — | ✅(导出/删除/登出) | |
| `/wealth` | ✅ | — | — | ✅(黄金日) | 🐞 日格不可点(P2-3) |
| `/synastry` | ✅ | ✅(demo 模糊) | — | ✅(5 关系切换) | |
| `/synastry/invite/[token]` | ✅ | ✅(invalid) | ✅(坏城市 inv-err/空校验) | ✅(双角色闭环) | 🐞 重放覆盖(P1-2) |
| `/share` | ✅ | — | — | ✅(4 模板+PNG 下载真) | |
| `/history` | ✅ | ✅(day-1) | — | — | |
| `not-found` | ✅ | — | — | — | |
| `error.tsx` | ⚠️BLOCKED | — | — | — | 组件在但无路由自然抛入，诚实标 BLOCKED 未伪 PASS |
| API（auth/chat/reading/geocode/synastry/admin/event/feedback） | ✅ | — | ✅(malformed→4xx，除 P1-4) | ✅(限流 429/降级) | |

**唯一缺口**：`error.tsx` 错误边界无法自然触发——建议加一条可控抛错的测试路由或单测覆盖。

---

## 5. 修复优先级建议

1. **P0-1 chat XSS** — 安全，生产同款，立即修（用户消息纯文本渲染）。
2. **P0-2 危机短路门控** — 安全网，把 detectCrisis 移客户端/无条件 POST，使其独立于 AI 开关。
3. **P1-5 双语宣称** — R4，要么接 i18n，要么撤「双语」字样（含 STATUS/CLAUDE.md/对外文案）。
4. **P1-2 邀请重放** — 病毒功能数据完整性，加 token 消费守卫。
5. **P1-1 刷新弹回** — 体验，calibration/reading 改用 useChartGuard。
6. **P1-4 reading 500、P1-3 SDK 并发** — API 健壮性。
7. P2 批量打磨。

建议 P0/P1 走 TDD：先加失败测试（XSS 转义、AI=off 危机短路、token 重放拒绝、残缺 chart 400、刷新存活），再修。

---

## 6. 生产环节（已授权，待执行）

Kevin 已确认拥有 vapeincity.com 并授权。本轮选择「先出报告」，故生产冒烟未跑。待跑项（生产是唯一真 AI 环境：有真 key、sonnet ~2–5s、真 KV）：
- 真 AI 首读是否到达并替换 stub、是否个性化。
- **危机短路经真 UI 是否触发**（验证 P0-2 在生产 AI=on 下确实保护真实用户——逻辑上会，需 live 坐实）。
- 真对话连贯性、thinking 动画、慢路径安抚。
- 生产 XSS（P0-1 同款代码）live 验证。
- 关键旅程冒烟 + prod-only 健康（资产加载、5xx、CSP/混合内容、SW 生产注册、manifest）。

> 注：生产 XSS + 危机触发为「主动测试」，会被 prod 埋点记录（`NEXT_PUBLIC_MOLLY_TEST=1` 测试数据导出时忽略）。
