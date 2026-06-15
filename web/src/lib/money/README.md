# Money Mirror — Slice 0 (`lib/money/`)

「金钱人格镜」的薄竖切：用钱当留存钩子（钱对你意味着什么 → 连载金钱故事），
内建对三条承重假设的埋点。完整设计见 `docs/superpowers/specs/2026-06-14-money-mirror-financial-entry-design.md`（v4），实现计划见 `docs/superpowers/plans/2026-06-14-money-mirror-slice0.md`。

## 模块

| 文件 | 职责 |
|---|---|
| `types.ts` | meaning 分类法（6 种 + 主/次张力）+ Chapter/Prophecy 类型（Prophecy 无 amount/date 字段 → 不报数字） |
| `persona.ts` | 星盘 → MoneyPersona（meaning 主次张力 + precision + 盲点/风格） |
| `narrative.ts` | 确定性 Chapter 骨架（行运塑形 + 故事弧 + 混合节奏 + themeKey 去重 + meaning 染色），不报数字 |
| `behavior.ts` | 越用越准：显式修正(强) + 隐式参与(弱) → 加权更新 meaning belief + confidence |
| `guardrail.ts` | 金钱文案唯一出口：金额×日期 / 羞耻句 / 赌性 → BLOCK |
| `track.ts` | H1/H2/H3 埋点（view/dwell/correction/engage/accuracy） |
| `variant.ts` | H3 的 80/20 A/B 分配（personalized vs barnum），按 userId 稳定 |

后端：`/api/narrative`（AI 文案围绕确定性骨架，KV 日缓存，guardrail+detectCrisis 兜底；
无 `ANTHROPIC_API_KEY` 时直接出确定性 baseline）。UI：`/money`（S1 揭示 + S1b 修正）、
`/money/today`（Day-1 开篇 / Day-N 连载 + 准度评分）、`/today`&`/chart` 上的 S0 入口卡。
Push 留存闭环复用既有 `lib/server/push.ts` + `/api/push/*`（无需新建）。

## 三条假设 → 看哪些事件（从 `/api/admin/export` 取）

> 这三条是 spec 补不了、只能跑出来的经验问题。Slice 0 的全部意义就是回答它们。

**H1 · 连载节奏撑得住吗（防罐头）**
- 事件：`money_narrative_view`、`money_narrative_dwell`
- 看：6–8 周的 dwell 时长曲线 + 复访频率；**先行指标**＝同盘连续 N 天叙事的重复度评分（用 `agent-test-runner` 思路离线跑）。轻日被无视 / 重页太稀 → 节奏假设错，调频或放弃硬日更。

**H2 · 学习回路喂得到数据吗**
- 事件：`money_meaning_corrected`、`money_meaning_engage`
- 看：达到 belief `confidence` 阈值的用户比例 + 精化后主观「更准」。隐式信号（停留/点击）够不够，不靠用户主动作答。饿死 → 准度感知（留存命门）长不出，需补主动信号。

**H3 · 是真准还是巴纳姆（最承重）**
- 事件：`money_accuracy_rating`，按 `variant` 分组（personalized vs barnum）
- 看：两臂「好准」差值 + 行为效度。差值不显著 → 「比测测更深」的差异化命题被证伪，整个战略重估。

## 通过阈值（开测前定死，否则不是 gate）
- 跨人群：揭示+修正后「说中了」比例，**陈昊型 + 秦姐型两段都 ≥ 阈值**（定性 go/no-go）。
- 留存：D7 回访 ≥ 现 Molly 基线 + Δ。
- 过了再建付费/蓝图/全月日历/金句卡/seam（本切均未建）；最后才谈 Path B 金融分发。
