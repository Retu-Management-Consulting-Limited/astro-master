# 实施计划 — 真实地理编码 + 历史时区

> 配套 spec：`2026-06-14-real-geocoding-historical-timezone-design.md`
> 方式：TDD（纯逻辑先写测试）。每单元做完跑 vitest，最后全量 typecheck + vitest + build。

## 顺序与依赖

```
1. timezone.ts        (零依赖, 纯逻辑)        ──┐
2. chart.ts 1行修复   (零依赖, 防回归)          ├─ 可并行/先行, 不依赖数据
3. build-cities.ts → 生成 cities.index.json     │
4. citydb.ts          (依赖 #3 产物)            │
5. nominatim.ts       (依赖 tz-lookup, mock fetch)
6. /api/geocode route (编排 #1#4#5 + KV)
7. input/page.tsx     (async 化 + loading/error)
8. 全量 typecheck + vitest + build
```

## 各步细节 + 测试方案

### 1. `src/lib/astro/geo/timezone.ts`
- `offsetAtHours(iana: string, p: {year,month,day,hour,minute}): number` — native Intl 2 步反解，返回小时（可含小数）。
- `zoneFromLatLng(lat, lng): string` — 包 tz-lookup（兜底路径用）。
- **测试** `timezone.test.ts`：墨尔本 1998-06-13→+10、1998-01-15→+11；上海 1988-07-01→+9、1998-07-01→+8；纽约 1998-07→-4、1998-01→-5；加尔各答→+5.5；加德满都→+5.75；NY spring-forward 2021-03-14 02:30 不抛错。

### 2. `src/lib/astro/chart.ts`（1 行）
- `utcDate()`：`Date.UTC(y, mo-1, d, h, mi - Math.round(tz*60))`。
- **测试** `chart.test.ts` 增：tz=5.5 的 BirthInput → 期望 UTC 含 :10 分钟尾（验证不丢 30 分钟）；保留现有整数 tz 用例（回归）。

### 3. `scripts/build-cities.ts` → `src/lib/astro/geo/cities.index.json`
- 解析 cities15000.txt（tab 分隔，19 列）。每行抽：geonameid、name、asciiname、alternatenames(仅留 CJK 与 ASCII-latin)、lat、lng、country code、population、timezone(iana)。
- 输出结构（压体积）：
  ```json
  { "rows": [[lat,lng,"iana","CC",pop,"主显示名zh","主显示名en"], ...],
    "index": { "归一化名": [rowIdx, ...] } }
  ```
- country 名→ISO 双语小映射：内置常见 ~40 国（中/英/ISO），生成进同 JSON 的 `countries` 字段。
- 脚本可重跑：`bun run scripts/build-cities.ts`（从 /tmp 或在线拉 zip）。产物 JSON 入库（体积可接受，~2-4MB）。
- **测试**：不直接测脚本；产物由 #4 的测试覆盖（断言墨尔本/上海等关键行存在且字段正确）。

### 4. `src/lib/astro/geo/citydb.ts`
- 模块级 lazy 加载 cities.index.json。
- `lookup(city: string, country?: string): {lat,lng,iana,label} | null` — 归一化（trim+lower，中文原样）查 index；country 经双语映射→ISO 后筛；多匹配取 population 最大；无 country 命中则全局取最大。
- **测试** `citydb.test.ts`：「墨尔本」「melbourne」「MELBOURNE」命中同行且 iana=Australia/Melbourne；「上海」iana=Asia/Shanghai；同名多国（如 Springfield US 多州 / 取人口最大）；country「澳大利亚」「Australia」「AU」均筛到 AU；乱码→null。

### 5. `src/lib/astro/geo/nominatim.ts`
- `query(city, country?): Promise<{lat,lng} | null>` — 调 `https://nominatim.openstreetmap.org/search`，带 `User-Agent: Molly-astro/1.0 (contact)`、`format=jsonv2&limit=1`、country 作 `countrycodes` 或拼入 q。失败/空→null。
- **测试** `nominatim.test.ts`：注入 fetch mock（vi.stubGlobal），验证 URL/UA 构造、解析首条、空结果→null、抛错→null。

### 6. `src/app/api/geocode/route.ts`
- `GET /api/geocode?city=&country=&date=YYYY-MM-DD&time=HH:mm`。
- 编排：citydb.lookup → 命中算 offset 返回；miss→KV(`gc:`) 读→miss→nominatim+zoneFromLatLng→写KV→算 offset；全失败→404 `{error}`。
- offset 由 timezone.offsetAtHours(iana, 解析 date/time) 算；time 缺→12:00。
- `runtime="nodejs"`。在 store.ts 加 `geoCacheGet/Set`（`gc:` 前缀）。
- **测试** `route.test.ts`：mock citydb/nominatim/store，验证四分支 + 404 + offset 正确注入；输入墨尔本 1998-06-13→tz=10。

### 7. `src/app/input/page.tsx`
- `submit` 改 async：`await fetch('/api/geocode?...')`；loading 期禁用按钮+文案「正在定位你的星空…」；404→错误态复用现有 `err` UI（提示换附近大城市）。
- 成功后照旧 `computeChart(birth)` 客户端 + `setChart` + push。
- 删除对旧 `geocode()` 同步函数的依赖；旧 `geocode.ts` 保留导出 `Geo` 类型或迁移。
- **测试**：E2E 激活漏斗已存在；本步靠 typecheck + 手动/Playwright 冒烟（AI off 下 stub 秒出不受影响）。

### 8. 验收
- `bun run typecheck` clean
- `./node_modules/.bin/vitest run` 全绿（新增 4 个测试文件 + 现有 26）
- `bun run build` 18+1 路由通过
- spec §7 的 7 条验收逐条核对
