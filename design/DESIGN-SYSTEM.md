# Iris · 设计系统（DESIGN-SYSTEM）

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
- **消息气泡**：Iris 左（#141a28 + 左下尖角）；用户右（蓝渐变 + 右下尖角）；**记忆回放气泡**金边 + 「🕰️ 她记得」标签。
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

金双环 + 12 分隔 + 东方旋转方块 + 星尘；**高亮驱动**：只亮 3–5 个亮点（金/粉 glow halo `radial-gradient` + glyph），其余星暗化 #586074；亮点相位线点缀。「盘越亮 = Iris 越懂你」（校准可视化）。

## 8. 语气

文案口吻见 [大师人设](../docs/2026-06-12-master-persona.md)：C 毒舌通透为底、戳准接住、镜不预言。金句进 serif、设为高潮。
