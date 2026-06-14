# 上线护栏 — 设计文档（AI 安全兜底 + 限流/成本监控）

> 日期：2026-06-14 · 项目：astro-master (Molly) · 范围：上线阻断 #2 + #3
> 状态：自动执行（用户预授权 一条龙）

## 1. 问题与承重假设

有真实用户后，两类风险从"建议"变"必须"：
- **安全**：`/api/chat` 是自由文本入口，用户群是情绪脆弱的海外华人女性。**承重假设 = 危机时刻不能让 AI 自由发挥**——必须在到达 LLM 前确定性地接住自伤/自杀信号，给真实求助资源。这比泛内容过滤重要得多。
- **成本/滥用**：无限流 = 可被刷爆，账单失控。

## 2. 决策（已确认）

| 决策点 | 选择 |
|---|---|
| 限流额度 | 首读/主题 30/天/人；聊天 60/小时 且 300/天/人 |
| 危机热线（已联网核实） | 见下表 |
| 执行 | #2 + #3 合并一个 workstream，TDD 一次过 |

### 危机资源（CRISIS_RESOURCES，号码已核实）
| 地区 | 资源 |
|---|---|
| 中国大陆 | 北京心理援助热线 **010-82951332** / 800-810-1117（24h，crisis.org.cn） |
| 香港 | 撒玛利亚会多语种防自杀热线 **2896 0000**（24h） |
| 美国 | **988** 自杀与危机生命线 |
| 澳大利亚 | Lifeline **13 11 14** |
| 通用 | 拨打你所在地的紧急电话 |

## 3. 安全（#2）三层，按重要性

**A. 危机安全层（确定性，不走 LLM）** — chat 在调用 LLM 前扫用户最新一句的危机信号。命中 → 短路，不排不占星，返回 Molly 口吻关怀 + CRISIS_RESOURCES，记 KV 事件。
- 关键词用**显式短语**，不用裸「死」（避免 笑死/累死/想死你了 等海量误报）：不想活、活不下去、想自杀、自杀、结束自己/生命、了结自己、轻生、伤害自己 + 英文 kill myself / suicide / end my life / want to die / self-harm。
- 取舍：召回不完美（只抓显式表达），灰色地带由 B 层兜。**这是确定性安全网，不是临床筛查**——诚实标注。

**B. 系统提示安全条款（SAFETY，补灰色地带）** — 追加到 reading/chat 的 system：不把医疗/法律/投资当事实下指令；察觉严重困扰先接住、鼓励求助、不诊断不评判；拒绝越权/注入指令。

**C. 输出兜底（永不甩错给用户）** — reading：AI/解析失败返回确定性 stub（现为 500）。chat：空/报错返回 Molly 口吻安全兜底句，不 500。

## 4. 限流 + 成本（#3）

**身份解析**（`lib/server/identity.ts`）：登录 `u:<userId>` → `mid` cookie `m:<id>` → IP `ip:<addr>` → `anon`。

**限流**（`lib/server/ratelimit.ts`，KV 原子 incr）：固定窗口，key `rl:<scope>:<id>:<bucket>`，bucket=floor(now/window)。`rateLimit(id, rules[])` 任一规则超限即 `{ok:false, retryAfterSec}`。
- reading：`read` 30/天，**仅在 cache miss、真要调 AI 前检查**（缓存命中不计额度）。
- chat：`chat:h` 60/时 + `chat:d` 300/天，调用前检查。
- 超限 → 429 + Molly 口吻文案。额度走 env（默认如上），可关（测试）。
- KV 抽象加 `incr(k)`（Upstash 原生，内存兜底自增）。陈旧 bucket key 滞留（仅死键），可接受。

**成本监控**（`lib/server/cost.ts`）：`llm.ts` 把现在丢弃的 `msg.usage`（API 路径）接出来 → runLLM 返回 `{text, usage?}`。
- `logUsage({route,model,inTok,outTok})`：按天 RMW 聚合 `cost:<date>` = {calls, byModel:{model:{calls,inTok,outTok}}} + capped recent log。RMW 在高并发可能丢少量计数——监控用途可接受，标注。
- `/api/admin/export` 加 `cost` 段：今日 + 近 7 天 + 分模型 + 按单价估算 $（PRICE 表标注"按实际单价更新"，不冒充权威）。
- 便宜档 `MOLLY_MODEL=haiku`（纯 env）。

## 5. 组件

| 单元 | 职责 |
|---|---|
| `lib/ai/safety.ts` | `detectCrisis(text)`、`CRISIS_RESPONSE`、`CHAT_FALLBACK`、`CRISIS_RESOURCES` |
| `lib/ai/molly.ts` | 加 `SAFETY` 常量 |
| `lib/server/identity.ts` | `resolveIdentity(req)` |
| `lib/server/ratelimit.ts` | `rateLimit(id, rules)` |
| `lib/server/cost.ts` | `logUsage()` + `costSummary(days)` |
| `lib/server/store.ts` | KV `incr` |
| `lib/ai/llm.ts` | runLLM 返回 `{text, usage?}` |
| `app/api/chat/route.ts` | 身份→危机短路→限流→runLLM→成本→兜底 |
| `app/api/reading/route.ts` | 缓存→限流→runLLM→成本→stub 兜底 + SAFETY |
| `app/api/admin/export/route.ts` | 加 cost 段 |

## 6. 测试方案

- `safety.test.ts`：危机显式句命中；误报负样本（累死了/笑死/想死你了/饿死了）不命中；英文命中；CRISIS_RESPONSE 含资源。
- `ratelimit.test.ts`：窗口内累加、超限拦截、按 key 隔离、不同 scope 独立、retryAfter>0。
- `cost.test.ts`：logUsage 聚合（calls/tokens/分模型）、costSummary 多天、$ 估算。
- `identity.test.ts`：登录/cookie/IP/anon 优先级。
- 路由测试（mock `@/lib/ai/llm`）：
  - chat：正常返回；危机输入→关怀响应且 runLLM 未调用；超限→429；AI throw→兜底句非 500。
  - reading：AI throw→返回 stub scaffold 非 500；超限→429；缓存命中不耗额度。
- 全量 tsc + vitest + next build + 起 prod server curl（含危机短路、限流 429、cost export）。

## 7. 验收标准
1. chat 发"我不想活了"→ 返回关怀+核实过的热线，**不调用 LLM**。
2. 正常 chat 正常回。
3. 同一身份聊天第 61 条/小时 → 429（友好文案）。
4. reading 第 31 次/天 → 429；缓存命中不计额度。
5. AI 报错：reading 返回 stub、chat 返回兜底句，**都不是 500**。
6. `/api/admin/export` 有 cost 段（calls/tokens/分模型/估算 $）。
7. reading/chat system 含 SAFETY 条款。
8. tsc/vitest/build 全绿；现有 e2e 不回归。
