# 个人日历 · 设计与开发最优路线（Build Roadmap）

> **文档类型**：开发路线 / 排程
> **日期**：2026-06-16
> **依据**：[Charter v1.2](2026-06-16-personal-calendar-charter-design.md) · [设计 Spec（A/B 已做实）](2026-06-16-personal-calendar-design-spec.md)
> **复用资产**：`web/src/lib/astro/{chart,wealth,calibration}.ts` · `web/src/lib/money/*`（slice0）· `/api/narrative` · [money-mirror-slice0 plan](plans/../2026-06-14-money-mirror-slice0.md) · [BUILD-PLAN](../2026-06-13-BUILD-PLAN.md) · `design/*.html`

---

## 三条最优原则

1. **别重写，扩现成。** repo 里 chart / wealth(旺平慎) / calibration / geocode / slice0 money domain / guardrail / behavior / 埋点 / hi-fi 全在——A/B/C/D/E 大半有地基。新做的只是"差量"。
2. **先用最小垂直切片验核心循环（被看穿 + 真准 + 召回），别等 C/D/E 全做完才上线。** slice0 本就是带 H1/H2/H3 假设的实验——顺势让它承载 charter 的今日格。
3. **验证为闸。** 核心循环留不住人，再漂亮的日历骨架也救不了。先过闸，再加层。

## 关键和解：slice0 的"故事/意义" vs charter 的"行动灯"

不是冲突，是两层：
- slice0 的 **persona/meaning（"钱对你意味着安全/自由"）= 自我模型底料（属 D/WHO）**。
- charter 的 **今日格行动灯（慎/宜/旺 + 内在 why + 赦免 + 门 + 验证）= 每日交付面（WHAT-TODAY）**。
- **meaning 喂 action 的个性化**："你这种把钱当安全的人，今天别为情绪买单。" 统一：persona 是 WHO，verdict 是今天的 WHAT。slice0 的 `narrative.ts`（连载故事）**演化成** B 的 `verdict`（行动灯），底层 deterministic-skeleton + LLM-copy + guardrail 架构原样复用。

## 映射：charter 单元 ↔ 现成资产（什么有 / 什么是新做的差量）

| 单元 | 已有（复用） | 新做的差量 |
|---|---|---|
| **A 今日格** | `/api/narrative` 的 skeleton+LLM+缓存+fallback 框；`design/*.html` hi-fi | 输出从"连载故事"改成**命令式行动灯三态**（慎/宜/旺 + 内在 why + 赦免糖 + **红留门** + 验证微互动） |
| **B 决策引擎** | `chart.ts`；`wealth.ts`（旺/平/慎 tone）；`narrative.ts` skeleton | **表型 lean（踩/推）**；**红绿稀有配额**（天定+保底）；**健康轨**（月亮/6宫/上升）；**channel 选择**；`nextCharged`；`prepCard` |
| **C 骨架** | BUILD-PLAN P3/P4：四 tab、今日 shell、财运月历 UI | **今天=家**（非平权 tab，重排）；**月历=伪装成氛围图的规划器**（点未来格调 B verdict 预览）；**章节按需浮出** |
| **D 校准** | `calibration.ts`（上升收窄）；`behavior.ts`（belief refine） | **timeConfidence 分布喂回 B 的 mode**；**行为 + 人生事件加权**；三条诚实注脚 |
| **E 护栏** | `guardrail.ts`（amount×date/羞耻/赌性）；`safety.ts` | **I1 外部预测检查泛化到健康轨（禁预言疾病）**；**净情绪月度账户** |

## 分阶段路径（含可并行拆分）

### 阶段 1 · 核心循环切片（de-risk，扩 slice0）—— 先做
一个真盘 → B1（扩 wealth + 表型起手 + 稀有配额）→ B2（今日格三态文案）→ A 渲染今日格 → 验证微互动。**钱轨先行**（slice0 已在钱）。
- 复用 slice0 全套（persona/guardrail/behavior/route/telemetry），把 `narrative → verdict` 改框（行动灯三态）。
- **先写动态内容契约 guard**（R14–R15）：相邻日 `not.toBe`、不同盘 `not.toBe`——这是反罐头的命门。
- 上一小撮真用户/真盘，量 **H1**（召回/cadence）**H2**（学习数据）**H3**（真准 vs 巴纳姆，slice0 已有 A/B）+ **无 push 次日回访**（charter 北极星）。
- **可并行（worktree 各一条分支）**：B1 规则（纯逻辑 TDD）∥ A 今日格 UI（照 hi-fi）∥ content-freshness guards ∥ E 钱轨 guardrail（已在，补健康预测检查）。

### 阶段 2 · 验证闸（不写码，读数）
H3 真准 > 巴纳姆？无 push 次日回访够不够？"被看穿"冷汗有没有发生？**没过 → 改文案/命中逻辑，不加层。**

### 阶段 3 · 补全 v1 双轨 + 表型 + 校准环
- 加**健康轨**（月亮/6宫，复用同骨架）→ channel 选择上线。
- **表型 lean** 行为学修正接 `behavior.ts`（踩上头的、推胆怯的）。
- **D 校准环**：`timeConfidence` 喂回 B 的 mode；接 `calibration.ts`；行为/人生事件加权。B 与 D 闭环。

### 阶段 4 · C 日历骨架
今天=家 + **月历=伪装规划器**（点未来格调 B verdict 预览、黄金日排布）+ 章节 chip 按需浮出。复用 BUILD-PLAN P3/P4 的月历 UI，但按规则 16–18 **重排（非平权 tab）**。

### 阶段 5 · 留存外壳 + 护栏收口
- **5 天钩子弧** + **PWA 加桌** + push/email 召回（BUILD-PLAN 已列 stub）。
- **E 净情绪月度账户** + 健康轨禁预言疾病检查。

## 工程纪律（沿用 repo 既有）

- **TDD**：纯逻辑（排盘/校准/表型/稀有配额/verdict）先写测试。
- **动态内容契约 R14–R15**：变化类断言用最强形式（相邻单元 `not.toBe`），禁 `Set().size>1` 假绿灯；新动态面登记进 `__guards__/content-freshness.test.ts`。
- **LLM 层**：用 eval-harness（LLM-as-judge）守 B2 文案不违 charter（命令式/内在/红留门/不外部预测）。
- **并行协作**：一 workstream 一 worktree + 分支；main 只收 PR；CI 绿才合。
- 缺 key → stub，接口留好标 `TODO(key)`。

## 一句话

> **不新建，扩 slice0；先把'今日格行动灯'这一个核心循环做实上线、用 H1/H2/H3 验真准与召回；过闸了才依次加健康轨、校准环、日历骨架、留存外壳。**
