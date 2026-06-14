# 真实地理编码 + 历史时区 — 设计文档

> 日期：2026-06-14 · 项目：astro-master (Molly) · 范围：替换 `TODO(geo)`
> 状态：已 brainstorm 定稿，待实施

## 1. 问题与承重假设

当前 `src/lib/astro/geocode.ts` 是一张写死 7 城的表，返回 `{lat, lng, tz, label}`，其中 `tz` 是**固定整数 UTC offset**。它喂进 [chart.ts](../../../web/src/lib/astro/chart.ts) 第 70 行 `Date.UTC(year, month-1, day, hour - tz, minute)`，把本地出生时刻换算成 UTC。

**承重假设 = 出生当刻的 UTC offset。** 它错 1 小时，上升星座/宫头偏约 15°，可能整盘重排——这是排盘对错的命门，远比 lat/lng 精度重要。固定 offset 必然错，因为：

- **DST（夏令时）**：墨尔本 1 月（南半球夏）是 +11 不是 +10；纽约夏天 -4 不是 -5。
- **历史时区变更**：中国 1986–1991 行过夏令时（1988 夏 = +9，非 +8）；多地历史 offset 变过。

所以本任务真正要做对的是 **(地点, 历史时刻) → 正确 offset**；geocoding 只是拿到 lat/lng 和 IANA 时区名的手段。

### 自查中实测确认的事实（非断言）

| 项 | 结论 | 证据 |
|---|---|---|
| `Date.UTC` 小时字段向零截断 | `hour - 5.5` 静默少算 30 分钟（印度/尼泊尔静默错） | node 实测：旧式得 02:40Z，正确应 03:10Z |
| 系统 tzdata 含历史 DST 规则 | 含。中国 1988→+9、墨尔本南半球 DST、分数时区全对 | `Intl ... longOffset` 实测 8 例全对 |
| native `Intl` 反解本地→UTC | 2 步修正法在 DST 边界稳健、spring-forward 不存在时刻不崩 | node 实测 5 例（含两个 DST 边界） |
| 改 chart.ts 后整数 tz 不回归 | 新旧完全等价（含跨日/午夜） | node 实测现有 fixture |
| GeoNames cities15000 有 IANA 列 | 有，第 18 列 `timezone : the iana timezone id` | GeoNames readme |
| GeoNames `alternatenames` 列**不含**中文 | 只有 ASCII 转写；中文在 `alternateNamesV2.zip`（语言码 zh） | GeoNames readme |
| `tz-lookup` 包 | v6.1.25，返回 IANA、永不抛错、152KB、纯 JS | npm registry |

## 2. 决策（已与用户确认）

| 决策点 | 选择 |
|---|---|
| city → lat/lng 数据源 | **混合**：离线 GeoNames cities15000 为主 + Nominatim(OSM) 兜底 |
| 运行位置 | **服务端** `/api/geocode`（客户端 bundle 不变重） |
| API 兜底 | **Nominatim (OSM)**，免费无 key，结果进 Upstash KV 缓存 |
| 历史 offset 计算 | **native `Intl`，零依赖**（自查后删掉原计划的 Luxon） |
| 同名/多匹配消歧 | **country 筛选 + 人口最大**，回显 label 让用户核对 |

## 3. 数据流

```
input 页 submit
  → fetch /api/geocode?city=&country=&date=&time=
      ① 离线库 citydb.lookup(city, country)
           归一化匹配(中/英/ascii) + country 筛 + 取人口最大
           命中 → { lat, lng, iana, label }
      ② miss → 查 Upstash KV 缓存(key = 归一化 country|city)
      ③ 仍 miss → Nominatim 查 → tz-lookup(lat,lng) → iana → 写回 KV
      ④ 全失败 → HTTP 404 + 友好提示（绝不编造坐标 = 绝不产出自信的错盘）
  → timezone.offsetAt(iana, {year,month,day,hour,minute})  // native Intl 2 步反解
       → 该出生时刻的 offset（DST / 历史 / 分数全对）
  → 返回 { lat, lng, tz: offsetHours, label }
  → 客户端 computeChart(birth) 照旧（纯逻辑，不动）
```

**降级原则**：任何一步只要拿不到可信坐标+时区，就报错，**绝不 fabricate**。一个自信的错盘比一句「没找到这座城市」伤害大得多（消费级 + 准度感知是留存命门）。

## 4. 组件（小而独立，单一职责）

| 单元 | 职责（接口） | 依赖 |
|---|---|---|
| `web/scripts/build-cities.ts` | 构建期脚本：下载 cities15000.zip + alternateNamesV2.zip，按 geonameid join、按语言码 `zh`/`zh-Hant`/`en` 过滤别名，输出紧凑双语索引 JSON。country 名→ISO 映射一并生成 | 一次性下载 GeoNames |
| `web/src/lib/astro/geo/citydb.ts` | `lookup(city, country) → CityRow \| null`。加载索引 JSON（模块级缓存），归一化匹配，country 筛选，人口排序取最大。`CityRow = {lat,lng,iana,label}` | 索引 JSON |
| `web/src/lib/astro/geo/timezone.ts` | `offsetAt(iana, localParts) → hours`（native Intl 2 步反解）；`zoneFromLatLng(lat,lng) → iana`（兜底路径用） | tz-lookup |
| `web/src/lib/astro/geo/nominatim.ts` | `query(city, country) → {lat,lng} \| null`。遵守 OSM 用量策略（1 req/s、自定义 User-Agent） | fetch |
| `web/src/app/api/geocode/route.ts` | 编排 ①②③④ + KV 读写 | 上述三者 + 现有 KV 封装 |
| `web/src/lib/astro/chart.ts` | **1 行修复**：offset 进分钟字段，修分数时区 | — |
| `web/src/app/input/page.tsx` | `geocode()` 同步 → `await fetch('/api/geocode')`，submit 加 loading 态与错误态 | — |

### chart.ts 的 1 行修复

```ts
// 旧: Date.UTC(y, mo-1, d, hour - tz, minute)            ← tz=5.5 被截断成 5，丢 30 分钟
// 新: Date.UTC(y, mo-1, d, hour, minute - Math.round(tz*60))  ← 整数分钟，分数时区正确
```

`tz` 接口（小时，可含小数 +5.5/+5.75）不变，故 chart 的 `BirthInput` 与全部测试 fixture 不动。

### timezone.ts 反解算法（已实测）

```
offMin(zone, dateUTC): 用 Intl longOffset 格式化 → 解析 "GMT±HH:MM" → 分钟
localToUTC(zone, parts):
  naive = Date.UTC(parts...)          // 先当作 UTC
  o1 = offMin(zone, naive)
  utc = naive - o1*60000
  o2 = offMin(zone, utc)              // 修正：防 naive 落在 DST 错侧
  if o2 != o1: utc = naive - o2*60000
  return { utc, offsetHours: o2/60 }
```

## 5. 边界与已知取舍

- **country 自由文本归一化**：内置双语「国名→ISO alpha-2」小映射（~250 条，构建期由 GeoNames countryInfo + 中文名生成）。匹配不到 country（用户空填/打错）→ 退回全局按人口最大；label 回显兜底让用户发现错配。
- **JSON 体积**：cities15000 ≈ 2.6 万行，精简列后估 ~2–4MB。Vercel serverless 函数限 50–250MB，无压力；模块级缓存跨热调用。必要时降级到 cities5000 子集。
- **DST 边界**：spring-forward 不存在的本地时刻 → 2 步法给出合理解、不崩；fall-back 模糊时刻 → 取其一（占星 MVP 可接受）。
- **未知出生时间**：`knownTime=false` 时用正午 12:00 计 offset；offset 只随日期变（除 DST 跨越午夜的极少数），影响可忽略。
- **Nominatim 生产边界（诚实标注）**：OSM 公共服务器对生产消费级流量有用量政策限制，长期/规模化需自托管或换 Mapbox。本期靠 KV 缓存 + 低频（仅离线 miss 才打）控制，**真上线放量前需复评此项**。
- **funnel 状态**：本期 store 仍存 `tz`（数字）。后续若 calibration 改日期需重算 offset，建议把 `iana` 也存进 funnel——本期记为后续增强，不做。

## 6. 测试计划（沿用项目 TDD：纯逻辑先写测试）

- `timezone.test.ts`：墨尔本冬(+10)/夏(+11)、中国 1988 DST(+9)/1998(+8)、NYC 夏(-4)/冬(-5)、印度(+5.5)、尼泊尔(+5.75)、spring-forward 不崩。
- `chart.test.ts`（新增）：分数 tz=5.5 产出正确 UTC；整数 tz 回归保持不变。
- `citydb.test.ts`：中文「墨尔本」/英文「melbourne」/ascii 命中同一行；同名多城按 country+人口取对；miss 返回 null；country 归一化（澳大利亚/Australia/AU）。
- `nominatim.test.ts`：mock fetch，验证 query 解析 + 与 tz-lookup 串接；网络失败优雅返回 null。
- `route` 层：mock citydb/nominatim/KV，验证 ①②③④ 编排与 404 降级。

## 7. 验收标准

1. 用户输入「墨尔本 / 澳大利亚 / 1998-06-13 08:40」→ 返回 tz=+10、正确 lat/lng，排盘与现有一致。
2. 输入南半球夏季日期（如墨尔本 1998-01-15）→ tz=+11（DST 生效）。
3. 输入中国 1988 夏季 → tz=+9（历史 DST）。
4. 输入印度城市 → tz=+5.5，UTC 换算精确到分钟（无 30 分钟丢失）。
5. 输入离线库无的小镇 → Nominatim 兜底命中并缓存；再次输入命中 KV。
6. 输入纯乱码城市 → 友好报错，不产出任何盘。
7. `bun run typecheck` clean；新旧单测全绿；现有 E2E 不破。
