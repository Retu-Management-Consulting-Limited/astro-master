# Molly · 设计系统（DESIGN-SYSTEM）

> 从 7+ 屏 hi-fi 中沉淀的设计语言。工程实作与后续屏一律照此。
> 美学方向：**暗夜天体 × 奢华编辑感（Dark Celestial Luxe）** —— 沉、神秘、高级；金 × 暗夜不跳色。
> 参考屏：`design/01-landing.html` … `design/08-chart.html`

---

## 1. 色票（CSS tokens）

```css
:root{
  /* 底色 / 空间 */
  --void:#07090f; --void2:#0c111d; --ink:#05070c;
  /* 金（唯一贵金属色 / 主强调 / CTA） */
  --gold:#c9a861; --gold-soft:#e0c98a; --gold-deep:#9a7d44;
  /* 文字 */
  --cream:#efe7d4; --cream-dim:#c2baa6; --mute:#7a8194;
  /* 功能色（克制使用） */
  --iris:#b58fb0;   /* 紫 · 明天/钩子 */
  --pink:#e69ec8;   /* 粉 · 感情高亮 */
  --blue:#8fb6d8;   /* 蓝 · 昨天/验证 */
  --green:#7fc99a;  /* 绿 · 财运旺/正向反馈 */
  /* 表单 / 卡片 */
  --field:#0f1320; --field-bd:#262d3d;
}
```
- **主色＝近黑午夜 + 金 + 米白**。功能色只在语义处点缀（昨蓝/今金/明紫、财运绿、感情粉），不平均分布。
- 财运日历专用：绿(旺)→白(平)→红(慎) 渐层，独立于品牌色（行动灯语义）。

## 2. 字体

```
显示 / 金句：'Cormorant Garamond' + 'Noto Serif SC'（serif，可斜体，文学感，"想晒"）
UI / 正文：  'Hanken Grotesk' + 'Noto Sans SC'（sans，干净，非 Inter）
```
- **金句、人格洞察、问题标题用 serif**（情感重量）；按钮、标签、列表、表单用 sans。
- 参考字号：落地大 hook 40px / 屏标题 31–34px / 首读正文 21px serif / UI 正文 14.5–15.5px / 标签 11px letterspacing .16em uppercase。

## 3. 品牌母题：宇宙之眼

- **一整只眼**：金边杏眼（clip-path almond）+ **宇宙星云虹膜**（暖金外星云 + 靛蓝放射纤维 `repeating-conic-gradient` + 黑瞳）+ 上下被眼睑裁切 + 眼角暗 sclera。慢转（虹膜 50–140s/圈）、呼吸微缩放。
- 小尺寸用 `.eye-mini`（34px，虹膜 conic + 黑瞳）；大用整眼。logo 落地见 `01-landing.html`。

## 4. 氛围（每屏必备）

- **底**：`radial-gradient(120% 60% at 50% -4%, #1c2440 0%, var(--void2) 42%, var(--void) 70%, var(--ink) 100%)`
- **星尘**：`.phone::before` 多个 `radial-gradient(1px 1px …)` 散点（白/金/紫）。
- **颗粒**：`.phone::after` feTurbulence noise，opacity .045，mix-blend-mode overlay。
- **设备**：`.phone` width≤428、radius 32、固定 height（~858）、`box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 0 1px #1a2030`。**勿用 100vh**（嵌入式预览会塌）。

## 5. 组件规格

- **CTA 按钮**：金色渐变 `linear-gradient(100deg,--gold-deep,--gold 45%,--gold-soft 60%,--gold 75%)`、深字 #1a1305、radius 40、流光 `::after` shimmer。
- **卡片**：bg --field、border --field-bd、radius 14–18。语义变体改 border + 顶部 dot 颜色（昨蓝/今金 hero 带发光边/明紫）。
- **Hero 卡（今天）**：金边 + `box-shadow:0 0 30px -12px rgba(201,168,97,.4)` + 内金句 serif。
- **Chips（为你挑的/追问）**：蓝调 `rgba(124,150,170,.08)` + border #2b3a4e + 文字 #a9c4dd。
- **输入框**：bg --field、border --field-bd、radius 12–13、`color-scheme:dark`、focus 金边 + `box-shadow:0 0 0 3px rgba(201,168,97,.12)`。
- **进度/度量**（懂你度/校准度/题进度）：轨 #1d2333、填充金渐变。
- **Tab bar**：4 项（今日 ☾ / 本命 ✶ / 对话 [eye] / 我的 ✦），active 金；顶边 1px + 底渐变。
- **消息气泡**：Molly 左（#141a28 + 左下尖角）；用户右（蓝渐变 + 右下尖角）；**记忆回放气泡**金边 + 「🕰️ 她记得」标签。
- **选项卡（校准）**：选中＝金边 + 金 radio 填充 + `box-shadow 0 0 0 3px rgba(201,168,97,.08)`。

## 6. 动效（catalog）

```
fade   : 0→1                       （元素登场）
rise   : translateY(14px)+fade     （内容上浮，错落 delay）
breath : scale(1→1.04)+opacity     （眼/glow 呼吸，5–7s）
spin   : rotate 360                （虹膜/星盘 50–140s，极慢）
shimmer: CTA 流光扫过（4.5–5s）
pulse  : 高亮微明灭（5s）
```
- **首读用错落 rise**（逐段 .9→1.5→2.1→2.7s）制造"被看穿"的揭示感。原则：高潮屏更慢更有仪式感。

## 7. 盘面（chart）

金双环 + 12 分隔 + 东方旋转方块 + 星尘；**高亮驱动**：只亮 3–5 个亮点（金/粉 glow halo `radial-gradient` + glyph），其余星暗化 #586074；亮点相位线点缀。「盘越亮 = Molly 越懂你」（校准可视化）。

## 8. 语气

文案口吻见 [大师人设](../docs/2026-06-12-master-persona.md)：C 毒舌通透为底、戳准接住、镜不预言。金句进 serif、设为高潮。

## 9. Flow-Completeness 自查（每个流程出屏前必过）

> 缘起：合盘曾漏掉「A 怎么发邀请」那一屏——只做了目的地（B 落地、结果），漏了连接性的发送动作。这是「因果/机制自查」House rule 的 UX 完整性版本。

1. **对照 spec 的步骤清单**：spec/文档里列的每一步 → 必有一个屏（或明确标注「无需屏」）。设计前先把流程步骤抄出来逐条勾。
2. **端到端走一遍，给每个过渡命名触发动作**：每屏都要答「**怎么来**（什么动作到这）+ **怎么走**（什么动作去下一屏）」。某个过渡找不到承接的屏 = 漏屏。
3. **多角色流程：每个角色各走完整路径**（如合盘的 A 全程、B 全程），不能只做共享结果。
4. **别只做「英雄屏」**：发送/分享、确认、空态(empty)、加载(loading)、错误(error)、回退——这些连接件与状态最容易漏，最伤体验。

## 10. 防再犯铁律 R1–R6（设计 + 工程双 gate）

> 缘起：一轮对着真实代码的 UX 审查发现 11 个问题其实只来自 6 个根因。这 6 条是 gate，不是建议——`design/` mockup 与 `web/` 实作都受其约束。每条都标了它当初制造了哪些 bug。

- **R1 ·「Mockup 是视觉规格，不是 DOM 规格」**（制造了 div-onClick 满天飞 / 无 focus / 无 aria-live / 表单无 autocomplete）
  「§0 工程实作照此」只对**视觉**成立。mockup 是无语义 styled-div，**禁止原样搬进生产**。落地一律：交互元素用 `<button>/<a>`（不是 `<div onClick>`）；表单用 `<label>`+`<input type/inputMode/autoComplete>`；可见 `:focus-visible`；异步更新（AI 回复 / toast / 「她记得」）挂 `aria-live`。详见 §11 无障碍基线。
- **R2 ·「占位值不许变成字面量」**（制造了 写死的「懂你度 62%」5 处 / invite 预填 1996-01-01）
  mockup 里的具体数字、示例日期都是占位。落地必须**接真实数据源或留空**；任何展示给用户的指标数字要么变量化（有真实来源）、要么删。**禁止把指标硬编码成常量。**
- **R3 ·「§9 Flow-Completeness 升级为出码 gate」**（制造了 合盘等待无超时态 / push 闭环缺兜底）
  §9 原是出屏 gate。现扩到代码：凡有等待/异步/多态的屏，**PR 描述必须逐条列出 loading / empty / error / waiting-timeout 各态的实现位置，或显式标「无需」**。漏一个连接件态 = 不可合并。
- **R4 ·「对用户的能力宣称，必须当 PR 兑现或当 PR 撤回」**（制造了 假「越用越准」/ 双语未接 / 12.8 万假社会证明 / ¥98 付费墙画了没接）
  这是最深的根，是 House rule「流畅≠正确」的**用户承诺版**。UI 对用户做出的任何能力宣称（会变准、双语、社会证明数字、付费解锁），**必须在同一个 PR 里要么兑现、要么从 UI 删掉**。禁止「宣称已上线、兑现挂 TODO」并存。
- **R5 ·「领域真值先于美术：设计阶段过一次自洽自查」**（制造了 性格题猜的上升盖掉真实星盘上升、还和 AI 正文打架 / 定价未定就画 ¥98）
  扩 House rule「因果/机制自查」到**领域真值**：涉及占星/金融/时间等有客观真值的机制（上升由出生时刻唯一确定），设计阶段必须验证不与真值冲突、且 UI 与后端事实同源。mockup 领先于未定商业决策时须标「依赖未定决策 X」，禁止直接当实现规格。
- **R6 ·「变现/留存/病毒功能必须有常驻入口」**（制造了 财运/合盘只能靠卡片露出、无 tab 入口）
  财运、合盘、分享这类留存/变现/病毒功能，至少一个常驻或半常驻入口。新功能上线前必答：**「它的常驻入口在哪？」**

## 11. 无障碍基线（R1 的落地清单 · 每屏必过）

```
□ 所有可点元素是 <button> / <a>，不是 <div onClick> / <span onClick>
□ 图标按钮有 aria-label；装饰性图标 aria-hidden（含 eye/logo/星盘 div）
□ 全局 :focus-visible 可见（已在 globals.css）；不裸用 outline:none
□ 表单：<label> 关联控件、正确 type + inputMode + autoComplete；不预填看似合理的假默认值
□ 异步区域（chat 流、思考动画、toast、校准反馈）有 aria-live / role="status"
□ 语义/信息不只靠颜色（财运日历红绿 → 配字形/数字）
□ 动效尊重 prefers-reduced-motion（globals.css 全局兜底）
□ 触控目标 ≥ 44×44（色板、单选点、tab）
```

## 12. PR 合并 gate（R3+R4 的执行点）

每个改动 UI 的 PR，描述里必须有：
1. **状态清单**（R3）：本屏的 loading/empty/error/waiting 各态实现位置或「无需」。
2. **宣称对账**（R4）：本 PR 新增/改动的对用户宣称，逐条标「已兑现：<代码位置>」或「已从 UI 删除」。
3. **a11y 勾选**（§11）：上面 8 条逐项过。
4. **数据源对账**（R7，见 §13）：本屏每个「他的/今天的」展示值，逐条指到数据源或标「已删」。

## 13. 样板冒充功能 —— 根因与铁律 R7–R9

> 缘起：一轮全 app 筛查发现 38 个同型 bug（今日/本命/对话/我的/财运/校准）：内容写死冒充个性化、日期冻结在 2026-06-13、反馈按钮无 onClick、输入存了没人用、UI 承诺没代码兑现。**根因只有一个。**

**根因 · 「完成」被定义成「长得像 mockup」，而不是「接了真数据 + 真时间 + 真交互」。**
hi-fi mockup（`design/*.html`）里全是**逼真的示例内容**——某一天的具体解读、「她记得」的具体回忆、「78%」、「12 张卡」、「6 月 13 日」。把 mockup 转成 React 时，**示例文案被当字面量照抄**，没接数据源；然后因为「跑起来长得像 mockup」就在 STATUS 标了「✅ 实现」。于是样板当成了功能；日期冻结，是因为 mockup 是某一刻的静态快照（6 月 13），那个字面量直接 ship 了。这是 **R2（占位值不许变字面量）的内容维度大规模复发**。

- **R7 ·「每个『他的/今天的』值必须能指到数据源」**（制造了全部 38 个 FAKE-PERSONAL/FROZEN-DATE bug）
  凡是呈现为**个性化**（你的盘/解读/记忆/分数）或**时间性**（今天/本月/昨天/明天）的展示值，**必须 trace 到 chart / props / fetch / `new Date()`**——绝不能是写死的字面量。在那个位置出现字面量 = bug。日期一律 `new Date()`，禁止 `2026,6,13` 这类硬编码。
- **R8 ·「Mockup→实现：先接数据，再抄样式」**（防「示例文案照抄成生产内容」）
  移植一张 mockup，**第一步是把每个示例值换成真实绑定**（或一个会在缺数据时明确报错/标记 mock 的占位），**第二步才是抄视觉**。禁止 ship 一个示例文案还是字面量的屏。
- **R9 ·「『完成』= 真数据 + 可交互 + 真日期，不是『长得像』」**（防「样板标成 ✅」）
  一个屏在 STATUS 标 ✅ 之前，必须过一遍「真 vs 假」自查：无 FAKE-PERSONAL、无 FROZEN-DATE、无 DEAD-CONTROL、无 DEAD-END-INPUT、无 UNBACKED-PROMISE（五类见 `docs/2026-06-14-bug-audit.md`）。

**自动护栏**：`web/src/__guards__/no-mock-content.test.ts` 是一个 CI 级 tripwire——扫描所有页面组件，发现「硬编码年份传给 dayWealth/monthWealth」「懂你度/校准写死百分比」「已知假文案」就让构建失败。**任何回归重新引入这类 bug，测试会红。** 这是「确保未来不再发生」的执行点。

## 14. 状态机 / 边界 / 约定 —— 铁律 R10–R13

> 缘起：多 agent 浏览器全测（`docs/2026-06-14-qa-multiagent-test-report.md`）发现第二簇 bug，根因是「范式存在但未强制」「边界不设防」「预期态当错误」「目的地有路径无」。根因综合见 `docs/2026-06-14-p1p2-fix-plan.md`。

- **R10 ·「一次性动作必须防重放/幂等」**（制造了 P1-2：合盘邀请 token 可重放覆盖对方星盘）
  权限/邀请/OTP 这类**以 token 为能力**的一次性动作：首次消费后即标记，重复提交→拒绝（`already`/409），**绝不 overwrite**。`synastry-invite.setPartner` 已实现 consume-once。
- **R11 ·「贵操作前先 fail-fast 结构校验」**（制造了 P1-4：/api/reading 对残缺 chart 返 500）
  API 接 user 数据，**第一步做结构完整性校验**（如 `isFullChart`：placements 非空含 Sun/Moon、ascSign、aspects 数组），不合格→ 4xx；只有业务异常（限流/AI 超时）才 5xx。下游函数可假设数据完整。
- **R12 ·「预期态 ≠ 错误」**（制造了 P1 报告 P2-2：匿名 /api/auth/me 返 401、每页刷红；P2-7：admin 401/403 不一致）
  public 探测路由的匿名访问是**预期态**，返 `200 {authenticated:false}` 而非 401。认证失败统一 401（凭证无/错），授权不足才 403——同类失败码必须一致。
- **R13 ·「不可用态必须既语义又视觉」**（制造了 P2-6：chat 发送按钮发送中不禁用）
  交互控件存在不可用态（typing/loading/空输入）时**必须** `disabled` attr + 视觉变化（opacity/cursor）；视觉态控件若不可交互，用语义中性元素，别让用户以为能点（P2-3：wealth 日格曾是 `role=img` 死格——现已改为可点 `<button>`）。

**自动护栏（新增）**：`web/src/__guards__/chart-gating.test.ts`——扫描 gated 页，发现「`router.replace('/input')` 但未走 `useChartGuard`」就让构建红，防 P1-1 水合竞态复发。`isFullChart`（`src/lib/astro/chart-validate.ts`）+ 路由测试守 R11。

> **离线壳验收（P2-5，非 bug，记此备忘）**：SW 注册被 `NODE_ENV!=='production'` 早返回（避免 dev HMR 陈旧 chunk），故离线壳**只能在 `next build && next start` 验**，`next dev` 下不可用。这是设计取舍，不是缺陷。

## 15. 动态内容契约 —— 铁律 R14–R15

> 缘起（2026-06-15）：用户报「换了一天，今日内容还和昨天一样」。**这不是 R7 那类写死字面量**——`dailyReading` 是接了真盘、真日期的真函数。两个新根因：① 文案按太粗的 `(受影响点, 吉/凶)` 桶选，且慢行星相位能维持 10–20 天 → 即使日期滚动，选出来的还是同一段（"沿轴不动"）；② 既有测试断言的是**弱属性** `new Set(...).size > 1`（14 天里有 2 种就过），重复一大片也是绿的 → **假绿灯，让人以为有保护**。修复：今日改月亮主导 + 慢星降级「这阵子」+ 文案按天轮换；测试改成断言**相邻日必不同**。

- **R14 ·「动态内容必须沿其轴真正变化」**（制造了「逐日冻结」bug）
  凡呈现为**按某轴变化**的内容（按天 / 按用户盘 / 按配对），不仅值要 trace 到数据源（R7），其**选择粒度必须细到沿那条轴产生可感变化**：按天的内容相邻日必须不同（让"今天"由真正每天动的量驱动，慢变量降级为诚实标注的多日"背景"，必要时按天轮换措辞）；个性化内容两个明显不同的盘必须产生不同文案。**值会变 ≠ 呈现会变**——验呈现层。
- **R15 ·「测目标属性，别测代理；断言最强形式，别断言存在」**（让 R14 的 bug 溜过 CI）
  修 X 求 Y 时，测 **Y 本身**（这次 `useNow` 只测了代理「日期会变」，没测目标「内容会变」）。变化类断言一律用**最强形式**（相邻单元 `not.toBe`），**禁止** `Set(...).size > 1` / `length > 1` 这种「存在两种」的弱断言——它是 smell，等于没测。

**自动护栏**：`web/src/__guards__/content-freshness.test.ts` 是 CI 级套件，也是**动态面注册表**——逐个断言 daily / wealth / first-read / theme / synastry / highlights 沿各自的轴（相邻日、不同盘、不同配对）真正变化。**新增任何动态面，必须在此登记一条强断言；不许为了让它过而削弱断言。** 这是「确保这类 bug 未来不再发生」的执行点。
