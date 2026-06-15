# Molly — 多 Agent 仿真测试 · Bug List

> 运行：2026-06-14 · 3 轮 · 75 agents · ~96 min · 本地 dev(stub, 内存KV)
> findings/复核为真：R1 32→15 · R2 54→16 · R3 63→16
> 范围：功能/流程/边界/健壮性/校验/安全/隐私(AI 文案质量不在内)

---

# Molly 占星 App — Bug List（第 3 轮 · QA Lead 主持）

> 状态：本轮对全部 round-1/2 条目做源码 + Playwright/curl 双重复测，**确认 0 个已修**。新增 4 条：H3 跨设备 boot race（high，与 C 同源但反向——guard 抢跑使返回用户被错误弹回 /input）、H2-share 扩展（/share 在 placements:null 崩，新页面纳入崩溃集）、N1 geocode 未认证未限流外部放大（medium，新探测面 root cause D）、N2 geocode parseLocal 范围不校验（low，新探测面 root cause A）。H1 补充 male-specific 变体（性别 male→female 静默翻转且 /me 永不显示性别 → 用户无从察觉）。组内按确信度/影响排序。所有保留项均经本轮源码行号核对。

---

## 🔴 HIGH（核心数据完整性 / 静默数据丢失 / 核心功能失效）

### H1. /me/birth 编辑页不回填已存数据，深链/冷启动时用 demo 默认值静默覆盖并损坏用户真实星盘 — 【复测：未修 · 本轮补 male 变体】
- **区域**：`web/src/app/me/birth/page.tsx:23-32`（useState 初始化器）+ `web/src/lib/store.ts:89`（skipHydration:true）
- **severity**：high
- **复现**：注入真实 chart（birth.year=1990/1995、birthForm.date=1990-03-15/1995-03-15、gender=male、city=北京、country=中国）→ 深链/硬刷新/PWA 冷启动打开 `/me/birth`（普通 in-app 导航不触发，store 已 hydrate）→ 表单显示 demo 默认 `1998-06-13 / 08:40 / 国家空 / female aria-pressed=true` → 仅补/改城市=上海 → 点 `[data-testid=save-birth]`。
- **期望**：rehydrate 完成后表单回填已存数据；保存只改用户实际修改字段（city-only edit 应保留 year/date/gender/country）。
- **实际**：保存后 localStorage `birth.year 1990/1995→1998`、`birthForm.date →1998-06-13`、`gender male→female`、`country→空`、`knownTime true→false`；computeChart 基于错误数据重算并 apiSync 跨设备持久化。**性别翻转完全不可见**：birthSummary（`web/src/lib/birth.ts:27-31`）与 `/me`（page.tsx:47）只渲染 date·time·city，从不渲染 gender，用户无从察觉损坏。
- **根因**：`useState(birthForm?.date ?? "1998-06-13")`（L23）、`useState(storedGender ?? "female")`（L28）在 birthForm/gender 为 undefined 的首帧即锁定 demo 默认；`if(!ready||!chart) return null`（L32）只挡 JSX 不挡已执行的 useState 初始化；无 rehydrate→state 的 useEffect 同步。
- **修复方向**：rehydrate 完成后 useEffect 同步表单 state；或 ready 前不挂载表单组件（而非仅 return null）。

### H3. 返回用户在新设备/PWA 冷启动深链 gated 页被 guard 抢跑弹回 /input，「跨设备看到 reading」核心功能静默失效 — 【本轮新增 · root cause C 反向 boot race】
- **区域**：`web/src/lib/guard.ts:16-18`（useChartGuard 同步 redirect）+ `web/src/components/AuthHydration.tsx`（apiMe()+loadServer() async useEffect）+ `web/src/app/register/page.tsx`（登录分支同步 loadServer 对照）
- **severity**：high
- **复现**：设备1 注册并 sync 一张完整 10 行星 chart 到账户（curl POST /api/auth/register 拿 msid cookie → POST /api/auth/sync）。设备2 全新 context，只注入 msid 会话 cookie、localStorage 为空（模拟书签/PWA 重装/清缓存后会话仍在）→ 直接 goto `/me`（或 /today /chart /wealth）。
- **期望**：持有效会话 cookie 的返回用户在新设备深链 gated 页，应先用 /api/auth/me 拉回账户 chart 再决定路由（按 AuthHydration 注释自述目标「a returning user on a NEW device sees their reading instead of /input」），停在目标页渲染。
- **实际**：8/8 稳定弹回 /input（gated testid present=0，trail `/page>/page>/input`）。`guard.ts:17` 在 `hasHydrated && !chart` 同步 `router.replace('/input')` 抢跑赢了 AuthHydration 的 async `apiMe()+loadServer()`；loadServer 之后确实填上 chart（lsChart=true），证明恢复链路本身没坏，纯时序竞态。对照：走 app 内 /register 登录分支正常落 /today，因登录 handler 在导航前同步 loadServer。
- **根因**：与 root cause C 同源（guard 与账户 hydration 不协调），方向相反——C 是「脏 chart 该弹未弹」，H3 是「有账户 chart 不该弹却弹」。guard 的 redirect 是同步 effect，账户 chart 恢复是 async 网络调用，首屏误判无盘。
- **修复方向**：guard 在判定 !chart 前等待 AuthHydration 完成（引入 authResolved 状态），或会话存在时延迟 redirect 直到 apiMe 返回。

---

## 🟠 MEDIUM（误导性错误 / 安全 / 崩溃 / 隐私 / DoS）

### H2/M3 横扫. 核心日常页 /today /chart /wealth /chat 对脏/半残 chart 无防御，整页崩成 ErrorBoundary 空白屏 — 【round-2 新增 · 本轮复测未修】
- **区域**：`web/src/lib/guard.ts`（useChartGuard 只判 `!chart` 不校验有效性）+ `web/src/lib/astro/wealth.ts:84-86` + `web/src/app/chart/page.tsx:26-27` + `web/src/lib/astro/chart-validate.ts`（isFullChart 已存在但只接 API 边界）
- **severity**：medium
- **复现**：prod build，addInitScript 注入 molly-funnel，chart 设为 placements:null / placements:[] / aspects:null / 仅单 Sun，goto 各 gated 页。
- **期望**：guard 用 isFullChart 校验，非法降级到 /input/空态，不整页崩。
- **实际**：/today /chart /wealth 在多种脏变体下崩到 ErrorBoundary（bodyLen=39，文案「星图转动时卡了一下…再试一次」）：placements:null→`reading 'find'`/`not iterable`；placements:[]/单 Sun→`reading 'lon'`（wealth.ts:84-86 `find('Jupiter')!.lon`）、`reading 'sign'`（chart/page.tsx:26-27 `find('Sun')!`）；aspects:null→`not iterable`。/chat 在 placements:null 崩。对照 /me（175）、/synastry（218）同数据存活 → **页面级**缺口。
- **根因**：guard.ts 只检查存在性；isFullChart 只接 /api/reading、/api/chat，未接页面渲染路径；下游 `.find(...)!.lon`/`!` 非空断言抛错。
- **修复方向**：useChartGuard 或各页用 isFullChart 校验，非法即降级。

### M3. 合盘 submit 接受空/无效 chart，导致发起人 A 合盘页整页崩 — 【复测：未修】
- **区域**：`web/src/app/api/synastry/invite/submit/route.ts:14` + `web/src/lib/astro/synastry.ts:16` + `web/src/app/synastry/page.tsx:67-68,112`
- **severity**：medium
- **复现**：建 token → `POST /submit -d '{"token":"<T>","chart":{}}'` → 200 ok；A 端 /synastry 见 `syn-partner-real` 横幅 → 点 `syn-type` → `Cannot read properties of undefined (reading 'lon')` → ErrorBoundary 整页不可用，重试再崩（坏 partner 持久化 KV，consume-once 阻止重提交无法自愈）。
- **期望**：submit 复用 isFullChart 校验非空 placements，非法 400。
- **实际**：submit/route.ts:14 仅判 `!body.token || !body.chart`，`{}` truthy 通过并 setPartner；page.tsx:68 把存储值 `as Chart` 仅判 truthiness；synastry.ts:16 `c.placements.find(...)!.lon` 抛错。isFullChart 已接 reading/chat 却漏接 synastry submit——同类防御不一致。Token 即 capability，任意链接持有者一条 curl 即 DoS 发起人页面。

### M7. submit 接受非对象 chart（字符串/数字/数组/placements:null/[]）作为真盘存入 — 【round-2 新增 · 本轮复测未修，M3 同根】
- **区域**：`web/src/app/api/synastry/invite/submit/route.ts:14`
- **severity**：medium
- **复现**：建 token（每次新 token）→ submit chart 分别为 `{}`/`"hello"`/`123`/`[]`/`{placements:null}`/`{placements:[]}` → 六种全部 `{"ok":true}` 200 并存为 partner.chart。
- **期望**：submit 校验 chart 为含必需天体的非空 placements 数组对象（复用 isFullChart），非法 400。
- **实际**：`!body.chart` 仅对 ""/0/null/undefined 为假；string/number/array/`{}` 皆 truthy 通过。A 端 synastry() 调 `.placements.find` 抛 `Cannot read properties of undefined (reading 'find')`。六种均在同一行同方式崩，blast radius 与 M3 相同——同一崩点的额外未防御输入集。

### M4. 持 token 任意第三方无认证可读取 B 完整出生信息 PII，违背「不会公开」承诺 — 【复测：未修】
- **区域**：`web/src/app/api/synastry/invite/route.ts`（GET 只读 token query，无 session 认证，返回整个 `partner: invite.partner`）+ `web/src/lib/server/synastry-invite.ts:45`（setPartner 存 birthForm）
- **severity**：medium
- **复现**：建 token → submit 带 `birthForm{date:1995-05-05,time:12:00,country:中国,city:北京}` → 无 cookie `curl 'GET /api/synastry/invite?token=<T>'` → 回包 `partner.birthForm` 原样返回全部出生信息。
- **期望**：GET strip birthForm，只返回排盘已用 chart + name。
- **实际**：唯一消费者 synastry/page.tsx 只读 partner.chart/name，birthForm 是死负载却泄露。token 为 randomBytes 96-bit 不可猜（capability 设计），故「任意第三方」= 持有/被转发链接者，非世界可读；medium。修复（GET 时 omit birthForm）极简非破坏。

### M5. 合盘 submit chart 无大小上限（2MB/20MB 入 KV verbatim）且 invite 创建无限流无 TTL — 【复测：未修】
- **区域**：`web/src/app/api/synastry/invite/submit/route.ts` + `web/src/lib/server/synastry-invite.ts:45`（仅 `name.slice(0,40)`，chart/birthForm verbatim，无 TTL）+ `web/src/app/api/synastry/invite/route.ts`（POST 无 rateLimit）
- **severity**：medium
- **复现**：建 token → submit `chart.junk='A'*2000000`（~2MB）→ 200，GET 读回 junk_len=2000000；20MB 亦 200 且读回完整（无任何上限）。连发 15 次 `POST /api/synastry/invite` → 全 200 无 429。
- **期望**：chart/body 设上限（几十 KB）超限 413/400；invite 创建接入限流 + 条目 TTL。
- **实际**：submit 无 size check；setPartner 存 verbatim 无 TTL/eviction；invite POST 未接 rateLimit（rateLimit() 已接 reading/chat，synastry 遗漏属不一致）。无认证可循环 create→submit 大 chart 直至 OOM。consume-once（二次 submit 409）、unknown token 404 工作正常。

### M2. 登录/注册接口无暴力破解 / 速率限制 — 【复测：未修】
- **区域**：`web/src/app/api/auth/login/route.ts`、`.../register/route.ts`、`web/src/lib/server/ratelimit.ts:27-33`（RULES 仅 reading/chat scope，无 auth）
- **severity**：medium
- **复现**：注册账号后对 /api/auth/login 连发 25/30 次错密码 → 全 401 无 429；连发 20 次 register（不同邮箱）→ 全 201。grep 确认 rateLimit( 只在 reading/chat route 调用，无 middleware.ts。
- **期望**：数次快速失败/建号后应 429。
- **实际**：login/register route 均未 import/调用 rateLimit。可无限撞库 + 无限建号。
- **修复方向**：加 `auth` rule + 两路由接入限流。

### N1. /api/geocode 未认证、未限流，未知城市每条 distinct 字符串都触发外部 Nominatim(OSM) 调用 → 外部放大型 DoS / IP 被封风险 — 【本轮新增 · root cause D 新探测面】
- **区域**：`web/src/app/api/geocode/route.ts`（无 auth/无 rateLimit/无城市长度上限；404 路径 L51 在 geoCacheSet L58 之前返回 → distinct 串永不缓存必打外部）+ `web/src/lib/astro/geo/nominatim.ts`
- **severity**：medium
- **复现**：未认证连发 10+ 个 distinct 不存在城市 `curl -G '/api/geocode' --data-urlencode 'city=ZZQ-nonexistent-$RANDOM' --data-urlencode 'date=1998-06-13' --data-urlencode 'time=08:40'`。
- **期望**：geocode 按 identity 接入限流、城市字符串长度上限、缓存负向结果，避免每条 distinct 串都打外部 OSM。
- **实际**：（1）无 auth——零 cookie 返 404 非 401；（2）无限流——12 个 distinct 未知城市 0×429；（3）无长度上限——5000 字符 city 被处理；（4）每个 distinct 未知城市打一次真实外部调用（已知 DB 城市 6ms vs distinct 未知 268-700ms 网络往返证实）；（5）404 路径在 geoCacheSet 前 return，distinct 串永远 miss DB+cache 打 OSM。循环 distinct 串放大为对 Nominatim（policy ~1 req/s）的无限外呼 → egress IP 被封会令全体真实用户排盘失败 + 轻自身 DoS。reading route 有 isFullChart 校验，优于此处。

### M6. 出生日期接受未来 / 极端年份（2099、9999、0001、明日），无校验直接排盘进漏斗 — 【复测：未修】
- **区域**：`web/src/app/input/page.tsx:83`（#birth-date 无 min/max，submit() L32-50 无范围校验）+ `web/src/lib/birth.ts`（resolveBirth 原样透传）
- **severity**：medium
- **复现**：/input → gender-female → `#birth-date`=2099-12-31 / 9999-12-31 / 0001-01-01 / 明日 → city=上海 → 提交 → 静默跳 /calibration，geocode 200，能生成 reading（实测 future 生成完整伪盘 ascSign=水瓶 + 10 placements）。
- **期望**：本命盘按定义是过去出生时刻；拒绝未来日期（>今天）并提示，年份设合理上下界（>=1900）。
- **实际**：runtime 确认 minAttr/maxAttr=null；submit 与 resolveBirth/computeChart 对 date 无任何范围校验。

### L3→M. 登出只清服务端 session，本地 molly-funnel 仍留完整星盘且不导航，下一用户仍可达 gated 页 — 【复测：未修，仍 medium】
- **区域**：`web/src/app/me/settings/page.tsx:94-98`（logout 仅 apiLogout()+setMe(null)+flash）vs `:101-113`（deleteAll 会 removeItem 3 key + window.location.assign）
- **severity**：medium（round-1 由 low 上调）
- **复现**：种 chart → 注册 → /me/settings → 点 `[data-testid=logout]`。停留原页无导航；/api/auth/me authenticated=false；但 localStorage molly-funnel 仍含完整 chart（ascSign、昵称、出生信息）；随后直接访问 /me 渲染前用户昵称/上升/出生信息，/today 未被 guard 弹回 /input。
- **期望**：共享设备 logout 一并清本地 molly-funnel（复用 deleteAll 模式）或至少导航离开 gated 区。
- **实际**：logout() 不 removeItem 不 navigate；guard.ts:16-18 仅判 chart 存在 → 残留 chart 完整即绕过。服务端 session 已正确失效（无远程 auth bypass），需物理共享设备 → medium。

---

## 🟡 LOW（导航 / UX / 隐私硬化 / 健壮性 / 成本护栏）

### M1. 清空出生日期提交，报错却说「没找到城市」——错误归因到错误字段 — 【severity 维持 medium，列输入校验族】
- **区域**：`web/src/app/input/page.tsx:100,103`（红框/建议只绑 city）+ `web/src/lib/birth.ts:49`（!res.ok 一律转 `没找到「${form.city}」`）+ `/api/geocode`
- **severity**：medium
- **复现**：/input → 清空 `#birth-date` → country=中国 city=上海 → 提交。或 `curl GET /api/geocode?city=上海&country=中国&date=&time=08:40` → 400 `missing date`。
- **期望**：日期为空应提示「请填写出生日期」并把红框放到日期字段；客户端提交前校验。
- **实际**：geocode 正确 400 missing date，但 birth.ts:49 把任何 !res.ok 转成城市未找到；UI 红框错标 city（实测 #birth-city border 红 rgb(229,115,111)、#birth-date 默认灰）；空城市显示「没找到「」」空引号。城市有效却被引导改错字段。

### L6. reading/chat 限流标识（mid cookie / x-forwarded-for）客户端可控，AI 开启后成本限流可零成本绕过 — 【round-2 新增 · 复测未修】
- **区域**：`web/src/lib/server/identity.ts:15-22`(resolveIdentity) + `web/src/lib/server/ratelimit.ts`
- **severity**：low（AI=OFF 时运行时影响为零，AI=ON 后变可利用）
- **复现**：固定 mid cookie → req#1-N 通过后 429；轮换 mid cookie 或伪造 x-forwarded-for（无 cookie）→ 每次获新桶配额绕过。两端点（/api/reading L116-117、/api/chat L65-66）皆 resolveIdentity→rateLimit。
- **期望**：成本类限流标识不应完全由客户端 header/cookie 决定——mid 做 HMAC 签名，XFF 仅可信代理后采信。
- **实际**：派生顺序 登录用户→`mid` cookie→`x-forwarded-for`[0]→anon；mid 与 XFF 均客户端可控无签名即进限流 key。匿名调用者每请求换 cookie/header 获全新固定窗口桶。当前 AI=OFF：超限 /api/reading 返 200 deterministic stub 零成本；/api/chat 确返 429 但 LLM 调用在可绕过限流之后。

### N2. geocode 日期/时间只校验 truthiness 不校验范围，month=99 / day=99 / time=99:99 返回 200 生成无意义时刻 — 【本轮新增 · root cause A 新探测面】
- **区域**：`web/src/app/api/geocode/route.ts:23-27`(parseLocal 只 `!year||!month||!day` 判 falsy) + `:25`(time 正则 `^\d{1,2}:\d{2}$` 匹配 99:99)
- **severity**：low
- **复现**：`curl '/api/geocode?city=上海&date=2099-99-99&time=08:40'` → 200；date=1998-06-99 → 200；time=99:99 → 200；对比 date=1998-06-00（day 0 falsy）→400 bad date。
- **期望**：month 1-12 / day 1-31 / hour 0-23 / minute 0-59 范围校验，超界 400。
- **实际**：超界字段经 JS Date overflow 静默 normalize（2099-99-99→2107-06-07），DST 时区因 normalized month 选错 UTC offset（NY 返 tz=-4 EDT 而非真实月份）→ 静默损坏本命盘瞬时。正常漏斗用 native input 防住，仅直连 API/非规范客户端可达 → low；与 M1 错误归因链叠加掩盖问题。

### H2-share 扩展. /share 在 placements:null 脏 chart 下崩到 ErrorBoundary（新页面纳入崩溃集） — 【本轮新增 · H2 同根】
- **区域**：`web/src/app/share/page.tsx:22`（chart.placements.find 无 null guard）+ `web/src/lib/guard.ts:17`（只判 !chart）+ `web/src/lib/astro/chart-validate.ts:15`（isFullChart 已能拦 placements:null 但只接 API）
- **severity**：low
- **复现**：addInitScript 注入 molly-funnel chart.placements=null（其余有效）→ goto /share。对照 placements:[]→bodyLen=472、aspects:null→477、单 Sun→477、full→482（均有 share UI）。
- **期望**：页面用 isFullChart 防御并降级（如 /api/reading 对空 placements 返 400），而非只渲染 ErrorBoundary。
- **实际**：/share 渲染仅 ErrorBoundary fallback（bodyLen=39「星图转动时卡了一下…再试一次」），无 share-card。placements:[] 存活（Array.find 空数组返 undefined），只有 null.find 抛错。/share 不在 round-2 H2 sweep。同 H2 缺口类。downgrade low：computeChart 总建非空数组，此态正常流程不可达，需篡改/半 rehydrate localStorage，且优雅降级带 retry。

### L1. 1900 年前出生日期被接受，产生时区/历法不可靠的盘 — 【复测：未修】
- **区域**：`web/src/app/input/page.tsx`（无日期下界/min）+ `web/src/lib/birth.ts`
- **severity**：low
- **复现**：/input → `#birth-date`=1850-03-03 → city=上海 → 提交 → 进 /calibration 无报错。`GET /api/geocode date=1850-03-03` 返 tz:8.0833333（上海 LMT +08:05:43）vs 1998 返 tz:8。
- **期望**：pre-1900（offsetAtHours LMT 偏移不可靠）应警告或拒绝。
- **实际**：无 min、无范围校验，静默基于历史 LMT 偏移排盘。产出可辩护 IANA-LMT 盘而非崩溃；隐含 126+ 岁用户，硬化项。

### L2. 已激活/游客用户在 /today 按浏览器后退会回到 /register 注册页 — 【复测：未修】
- **区域**：`web/src/app/register/page.tsx:32,57,69,84,109`（router.push 而非 replace，无守卫）
- **severity**：low
- **复现**：漏斗到 /register → 点 `[data-testid=login]`（游客入口/continueLocal）进 /today → 浏览器后退 → 落 /register，`[data-testid=account-submit]` 完整注册表单可见。
- **期望**：已激活/已有 chart 用户后退不应被丢回注册表单。
- **实际**：continueLocal()/登录/notify 均 router.push 新增 history；/register 无 useEffect/redirect 守卫。goForward 可回 /today，纯 stale-page 后退，无数据丢失。
- **修复方向**：router.replace('/today')；或 /register 在已有 chart 时守卫跳 /today。

### L4. 注册接口接受超长 email（5000 字符）与 ~2MB profile 负载（无大小上限） — 【复测：未修】
- **区域**：`web/src/app/api/auth/register/route.ts`（req.json() 无 body limit）+ `web/src/lib/server/auth.ts`(validateEmail `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` 无长度界)
- **severity**：low
- **复现**：5000 字符 email local-part → 201；profile.x='A'*2000000(2MB) → 201 且 GET /api/auth/me 确认 len=2000000 持久化；10MB 亦 201。
- **期望**：register 对 email 长度（RFC-5321 ≤254）与 body/profile 大小设上限。
- **实际**：无长度界、无 size limit、profile 未校验直存 KV。无 auth bypass/数据泄露，需滥用建号；健壮性 + 轻 DoS。

### L5. Email NFC/NFD Unicode 同形不归一，肉眼相同的邮箱可注册成两个账号 — 【round-2 新增 · 复测未修】
- **区域**：`web/src/lib/server/auth.ts:71`(emailKey) + `:85`(createUser) 只 `trim().toLowerCase()` 无 normalize
- **severity**：low
- **复现**：注册 `café<ts>@x.com`（NFC é=U+00E9）→ 201；再注册其 NFD 形式（cafe+U+0301...@x.com，肉眼相同）→ 也 201。两账号回显均 `café...@x.com`。
- **期望**：注册前 `.normalize('NFC')` 再 lowercase 去重。
- **实际**：NFC/NFD raw lower 不等但 NFC-normalized lower 相等。case-dup 正常（混大小写第二次 409）证明仅缺 Unicode normalization。影响为重复账号/登录混淆而非 takeover；一行修复。

---

## 待关注的横向问题（跨多 bug 的系统性根因）
- **A. 输入校验缺失**：/input、register、geocode parseLocal 普遍缺范围/大小/normalize 校验（M1/M6/L1/L4/L5/N2 共因）→ 客户端 submit + 服务端 route 双层 guard。
- **B. Hydration 与 useState 初始化竞态**：`skipHydration:true` + useState 默认值初始化器是 H1 根因；H3 是同一 hydration 时序在 guard 侧的反向表现。需排查其他读 store 默认值的页面（calibration/reading/today/me）。
- **C. chart 有效性 / 账户 hydration 与 guard 不协调**：isFullChart 只接 API 边界未覆盖页面渲染与 synastry submit（H2 横扫 / H2-share / M3 / M7 共因）；guard 与账户 chart 恢复时序竞态既会「该弹未弹」（脏 chart 渲染崩）也会「不该弹却弹」（H3 返回用户被弹回 /input）→ guard 层统一接 isFullChart + 等待 authResolved。
- **D. 安全限流 / body-size / 身份不可伪造未覆盖全部路由**：ratelimit 与 body-size 仅覆盖 reading/chat；auth、synastry、geocode 全裸（M2/M5/N1/L4）；限流 identity 客户端可控（L6）。geocode 还会把无限流放大为对外部 OSM 的滥用（N1）。

---

## 逐轮会议小结

### Round 1（findings 32 → 复核为真 15）
第 1 轮覆盖了核心漏斗（/input 出生信息录入与校验）、个人中心编辑流（/me/birth）、认证接口（login/register）、合盘邀请全链路（invite/submit/读取）以及浏览器导航/退出登录的 UX。共合并去重得到 11 条经对抗复核为真的 bug（1 high、6 medium、4 low），并识别出 3 个横向系统性根因（输入校验缺失、hydration 竞态、安全限流/大小未覆盖全部写入路由）。最严重的是 H1：直接深链/硬刷新/PWA 冷启动打开 /me/birth 时，store skipHydration 导致 useState 初始化器锁定 demo 默认值，用户仅改一个字段保存即会用 1998-06-13/女 等错误默认值静默覆盖并损坏其真实星盘，且 apiSync 到账户、/me 不显示性别使用户无从察觉——这是驱动全 app 的核心资产的静默数据丢失。安全面最值得注意的是认证端无任何限流（M2）与合盘 token 泄露 B 精确出生 PII（M4）、空 chart 崩溃发起人页面（M3）这一组合盘信任边界问题。

**下一轮方案**：下一轮聚焦三条线：

1) 复测 + 扩面 H1 hydration 竞态（最高优先）：除 /me/birth 外，系统性审计所有读 zustand store 默认值的页面（/calibration、/reading、/today、/me、/me/settings、/synastry）在「直接深链 / 硬刷新 / PWA 冷启动」下是否同样捕获 demo/undefined 默认值并据此写回。重点验证任何「读已存值预填、保存即覆盖」的表单。统一用 production build + Playwright addInitScript 注入后 page.reload() 的方式（dev headless 不 hydrate 已知为环境噪声，必须用 prod build）。

2) 加深合盘信任边界与服务端校验：M3/M4/M5 同源于 submit 几乎不校验。下一轮穷举 submit 的恶意 payload（placements 为空数组/缺单个天体/嵌套超深/字段类型错误/重复 submit 覆盖/token 过期或不存在/同 token 并发 submit），并验证 invite 创建是否也无限流（结合 M5）。复测 M4 修复时确认 GET 回包确实 strip 掉 birthForm 且 A 端读数不受影响。

3) 安全与边界硬化复测：M2 限流、L4 大小上限修复后回归（auth login 连发应 429、超大 body 应 413/400）。新增探测面：(a) /api/reading 与 /api/chat 现有限流是否可被绕过（换 IP/header/账号）；(b) 注册 email 大小写/Unicode 同形字是否导致账号重复或枚举差异；(c) 漏斗中途状态被篡改（localStorage molly-funnel 注入半残 chart：缺 ascSign、placements 为 null）时各 gated 页是否崩溃而非降级——这是 M3 同类「下游消费未防御上游脏数据」模式，值得横扫。

4) 未触及区域补测：/calibration 与 /reading 的实际内容生成（本轮只验证「能进入」未验证产物正确性）、time 字段（unknown-time 路径）、i18n/locale 切换、PWA 离线/安装态。

### Round 2（findings 54 → 复核为真 16）
本轮以源码复测为主、curl/Playwright 抽测为辅，对全部 14 条 round-1 发现做了对抗复核：**0 条已修**——最近提交 `5d7788e fix(audit-2)` 早于本 QA 周期、修的是 XSS/day-1 而非本清单。新增 4 条：(1) H2 横扫——M3 的「`.find(...)!.lon` 非空断言 + guard 只判 chart 存在」模式在 /today /chart /wealth /chat 四个核心日常页全面坐实，脏/半残 chart 整页崩 ErrorBoundary（对照 /me、/synastry 存活，证明是页面级缺口；项目已有 isFullChart 却只接在 API 边界）；(2) M7——submit 连非对象 chart（string/number/array）都接受存储，扩大 M3 未防御输入集；(3) L5——email 缺 NFC normalize，同形邮箱可双开账号；(4) L6——限流 identity（mid cookie / x-forwarded-for）客户端可伪造，AI 开启后成本护栏可零成本绕过。最严重仍是 **H1**（深链 /me/birth 静默用 demo 默认值覆盖真实出生数据 1990→1998、male→female 并 apiSync 持久化，用户无感知）。系统性根因收敛为四族：输入校验缺失、hydration/useState 竞态、chart 有效性校验只在 API 边界未覆盖页面与 synastry submit、安全限流/body-size/身份不可伪造未覆盖 auth+synastry 全部路由。

**下一轮方案**：下一轮聚焦三点。**(1) 复测修复**：本轮 0 修复，下轮首先 grep diff 确认开发是否动了 guard.ts（是否接入 isFullChart）、submit/route.ts（是否校验 chart 形状）、ratelimit.ts（是否加 auth scope）、me/birth/page.tsx（是否加 rehydrate useEffect）、identity.ts（mid 是否签名）——逐条对照本清单关闭或保留。**(2) 加深薄弱区——横向根因 B（hydration 竞态）**：H1 只在 /me/birth 坐实，但同模式 `useState(storeField ?? default)` 可能潜伏于 calibration/reading/today/me 其他编辑入口；下轮系统性深链/硬刷新每个读 store 默认值的页面，看是否有第二处静默覆盖。**(3) 加深 chart 有效性边界（根因 C）**：H2 横扫已覆盖 4 页 ×4 变体；补测 /share、/me/birth 在脏 chart 下的行为，并验证若给 guard 接 isFullChart 后是否会把合法但「无 birthtime / 正午估算」的盘误杀（避免修复引入回归）。**(4) 新探测面**：a) /api/geocode 的输入边界（超长 city、注入字符、缺 country 的归因）；b) session/cookie 安全属性（SESSION_COOKIE 是否 HttpOnly/SameSite/Secure，sessionCookieOpts 审计）；c) synastry token 的 consume-once 在并发 submit 下是否有 TOCTOU（两个 submit 同时进 setPartner）；d) reading/chat 在 AI=ON 配置下实测 L6 绕过的真实成本影响（本轮因 AI=OFF 仅给 low）。**(5) 回归守卫**：建议下轮把 H1、M3、H2 横扫各写成一条可复跑的断言脚本（已存在 qa_l2_back*.mjs 可作模板），让后续轮次能快速确认是否真修。

### Round 3（findings 63 → 复核为真 16）
第 3 轮对 round-1/2 全部条目做源码行号 + Playwright/curl 双重复测，确认 0 个已修，并新增 4 条。最严重的是两个 high：H1（深链/PWA 冷启动打开 /me/birth 不回填，一次城市编辑即静默把真实星盘覆盖成 demo 默认值——本轮证实连 gender male→female 也被翻转，且 /me 从不显示性别使损坏完全不可察觉）；新发现 H3 是同一 hydration 时序在 guard 侧的反向表现——返回用户在新设备/PWA 重装后深链 gated 页时，guard 的同步 redirect 抢跑赢了账户 chart 的 async 恢复，8/8 稳定把人弹回 /input，使「跨设备看到 reading」核心功能静默失效（恢复链路本身没坏，纯竞态）。两条共同坐实横向根因 B/C：skipHydration 下 guard 既会「该挡脏 chart 没挡」（H2/H2-share/M3/M7 整页崩 ErrorBoundary）也会「有账户 chart 却误判无盘弹走」。新探测面 root cause D 暴露 geocode 未认证/未限流，distinct 未知城市每条都打外部 Nominatim 且 404 不缓存，可放大为对 OSM 的滥用致 egress IP 被封（N1，medium）；N2 是 geocode parseLocal 只判 truthiness 不判范围（99:99、month=99 经 Date overflow 静默选错 DST 时区，low）。isFullChart/ratelimit/body-size 三套防御均已存在却只接在部分边界的「防御不一致」是贯穿 M2/M3/M5/M7/N1 的元模式。

**下一轮方案**：下一轮优先级与方向：
1) 复测修复（若开发已动手）：H1（深链 /me/birth city-only 编辑后 store 不变）、H3（新 context 仅 msid cookie 深链 /me 不弹 /input 并渲染账户 chart）、H2/M3/M7（脏 chart/非法 submit 降级不崩）、N1（geocode 未知城市突发限流 + 404 缓存）。
2) 深化 hydration/boot race（root cause B/C 仍最薄弱）：把 H3 场景扩到所有 gated 页（/today /chart /wealth /chat /synastry /share）× 三种 boot（深链、PWA 冷启动、清缓存后会话仍在）矩阵化跑；排查 calibration/reading/today/me 是否也有 H1 式 useState 默认值初始化器锁 demo 值；测「登录态但 localStorage 半 rehydrate」中间态（chart 存在但 placements 未填）是否触发 H2 崩溃 + H3 误弹的叠加态。
3) 加深 synastry capability 链：token 转发后第三方能否覆盖已 consume 的 partner（race POST）、A 端在 partner 为 N2 式越界 birthForm 时排盘是否再崩、submit name 超 40 截断是否引入其它注入面；M4 birthForm 泄露 + M5 无 TTL 组合下「持旧链接长期可拉 PII」的时间窗。
4) 系统性扫「防御不一致」元模式：列出 isFullChart / rateLimit / body-size 三套现有防御的全部调用点 vs 全部入口路由，矩阵化找出还有哪些路由漏接（已知 auth/synastry/geocode 漏，疑似还有 /api/auth/sync、/api/auth/me 写路径）。
5) 探测尚未碰的面：/api/auth/sync 的 profile 是否同样无 size/schema 校验（与 L4 同根）、chat 端点在 AI=ON 模拟下 message 体积/历史长度上限、track/分析端点是否未认证可灌数据。
6) 复核遗留输入校验族（M1/M6/L1/N2）若集中修可一并验范围 + 错误归因 + 字段红框三件套。


---

## 复核 @ 当前 HEAD（2026-06-15，只读源码核对）

> 结论：**19 条基本全 OPEN**。并行进程修的是另一批（R12/P-系列：`/api/auth/me`→200、admin export→401、合盘 consume-once 重放 409、viewport 可缩放、SDK 信号量、isFullChart 接进 reading/chat **API 边界**），与本清单几乎不重叠——本清单的 H2-sweep/M3/M7 是**页面渲染**与**synastry submit**，仍未防御。

| ID | 状态 | 证据（current HEAD） |
|---|---|---|
| H1 me/birth 覆盖真盘 | **OPEN** | `me/birth/page.tsx` 仍 `useState(birthForm?.date ?? "1998-06-13")`，无 rehydrate→state useEffect |
| H3 跨设备 boot race 弹回 /input | **OPEN** | `guard.ts` 仍同步 `if(hasHydrated&&!chart) replace('/input')`，未等 AuthHydration |
| H2/M3-sweep gated 页脏 chart 崩 | **OPEN** | `isFullChart` 只在 reading/chat **API**；guard 与页面渲染未校验 |
| H2-share /share 崩 | **OPEN** | 同上 |
| M3 synastry submit 空 chart 崩 A | **OPEN** | `invite/submit/route.ts:14` 仍仅 `!token||!chart` |
| M7 submit 非对象 chart | **OPEN** | 同上 |
| M4 invite GET 泄露 B 出生 PII | **OPEN** | `invite/route.ts:26` 仍 `partner: invite.partner`（含 birthForm） |
| M5 invite 无 size/TTL/限流 | **OPEN** | submit 无 size check；invite POST 无 rateLimit |
| M2 auth 无撞库限流 | **OPEN** | rateLimit 仅 reading/chat；login/register 未接 |
| N1 geocode 未认证/未限流 | **OPEN** | geocode route 无 resolveIdentity/rateLimit |
| N2 geocode 日期范围不校验 | **OPEN** | parseLocal 仅 truthiness，month=99 通过 |
| M6 接受未来/极端出生年 | **OPEN** | input 无 min/max；geocode 不校验范围 |
| M1 空日期报错归因到城市 | **OPEN** | input 无字段级校验 |
| L6 限流身份客户端可伪造 | **OPEN** | identity 用 mid cookie / x-forwarded-for |
| L1 pre-1900 日期 | **OPEN** | 无下限校验 |
| L2 后退键回 /register | **OPEN** | 未处理 |
| L3 登出不清本地盘 | **OPEN** | `logout` 仅 apiLogout+setMe(null)+flash（reset/removeItem 在 deleteAll，非 logout） |
| L4 register 超长 email/profile | **OPEN** | register 无 size 上限 |
| L5 email Unicode 同形可重复注册 | **OPEN** | createUser 仅 trim+toLowerCase，无 NFC |

并行进程已修（不在本清单，记录以免重复）：`/api/auth/me` 401→200{authenticated:false}、admin export 403→401、合盘 consume-once、viewport pinch-zoom、SDK 并发信号量、isFullChart 接 reading/chat API。

---

## 修复 @ 2026-06-15（按 5 根因，TDD，全绿）

> tsc 0 · vitest 230 · build 0 · playwright 11/11（新增 robustness: H2-sweep 崩溃护栏 + H1 回填 e2e）

| ID | 状态 | 修复 |
|---|---|---|
| H1 me/birth 覆盖真盘 | ✅ FIXED | 表单抽成子组件，仅在 guard ready 后挂载 → useState 读到真实值（e2e 验证回填 1990/北京/male） |
| H3 跨设备 boot race | ✅ FIXED | 加 `authChecked` store flag；guard `ready=hasHydrated&&authChecked`，等 AuthHydration 的 /me 完成（3s 超时兜底）再判 redirect |
| H2-sweep / H2-share 脏 chart 崩 | ✅ FIXED | `useChartGuard` 接 `isFullChart`，非法 chart 视作无盘→/input（e2e 验证 /today /chart /wealth /share 不崩） |
| M3 / M7 synastry submit 空/非对象 chart | ✅ FIXED | submit 路由接 `isFullChart`→400；synastry 页 partner 也校验（防御） |
| M4 invite GET 泄露 PII | ✅ FIXED | GET 只返回 {name, chart}，去掉 birthForm（测试断言 birthForm undefined） |
| M5 invite 无 size/限流 | ✅ FIXED | submit body 64KB 上限(413)；invite 创建接 RULES.invite 限流 |
| M2 auth 无撞库限流 | ✅ FIXED | login/register 接 RULES.auth(10/min,60/h)→429 + body 上限 |
| N1 geocode 未认证/未限流 | ✅ FIXED | geocode 接 RULES.geocode(30/min)→429 + city 80 字上限（e2e 验证 429） |
| N2 geocode 日期范围 | ✅ FIXED | `validBirthDateTime` 校验 month/day/time 范围→400 |
| M6 / L1 未来/极端/pre-1900 日期 | ✅ FIXED | input 加 min/max + 提交前 `validBirthDateTime`；geocode 同源校验 |
| M1 空日期错误归因 | ✅ FIXED | input 字段级校验：缺日期→「请先选出生日期」，不再甩给城市 |
| L3 登出留本地盘 | ✅ FIXED | logout 现 reset + removeItem + 跳 /（e2e 验证重定向） |
| L4 register 超长 email/profile | ✅ FIXED | register body 64KB + email 200 字上限 |
| L5 email Unicode 同形重复注册 | ✅ FIXED | createUser/emailKey 统一 NFC 归一（单测 NFC≠NFD 但同账号） |
| L2 后退键回 /register | ⚠️ 部分 | 未单独处理（属导航历史，影响小）；guard 修复后回退到 gated 页不会崩 |
| L6 限流身份可伪造 | ⚠️ 部分缓解 | 登录用户走 userId（不可伪造）；匿名走 mid/IP 仍可换；已对 auth/geocode/invite 加限流缩小面，彻底修需服务端身份 |

新增/改动：`lib/astro/birthdate.ts`(纯日期校验)、`lib/server/http.ts`(body 上限)、`ratelimit.ts`(auth/geocode/invite RULES)、guard/AuthHydration/store(authChecked)、me/birth(子组件回填)、auth(NFC)、synastry invite GET/submit、geocode、input、settings logout。+12 单测、+2 e2e。
