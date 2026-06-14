# 真实账号体系 — 设计文档

> 日期：2026-06-14 · 项目：astro-master (Molly) · 范围：上线阻断 #1
> 状态：已定稿，自动执行（用户预授权 一条龙）

## 1. 问题与承重假设

现状：注册是 stub（`/register` 三个假按钮都直接 `finish()→/today`），用户数据（birth/chart/firstRead/nickname）只存 localStorage。换设备或清缓存 = 数据全丢；埋点是 `mid` cookie 旁路捕获，和"用户"无关联。

**承重假设 = 用户身份 + 服务端持久化。** 没有它，"越用越准 / 明天接着跟你说"的留存承诺无法兑现（数据在本地，明天换台手机就没了）。所以本任务的核心不是登录 UI，而是：**让一份出生盘绑定到一个可跨设备恢复的账号上**。

### 自查中实测确认（非断言）

| 项 | 结论 | 证据 |
|---|---|---|
| `node:crypto` scrypt 可哈希+timing-safe 校验 | 可。哈希 161 字符、校验正确、拒错、随机盐 | node 实测 |
| 零依赖、serverless 安全 | scrypt 是 Node 内置，Vercel Node runtime 可用 | 同上 |
| 复用既有 KV + cookie-session | `/admin` 已用 httpOnly cookie；`store.ts` 有 KV(Upstash/内存兜底) | 既有代码 |

## 2. 决策（自主选定，跟随既有栈）

| 决策点 | 选择 | 理由 |
|---|---|---|
| 认证方式 | **邮箱 + 密码** | register 页主 CTA 已是"用邮箱继续"；Google/Apple 需外部 OAuth 配置（client id/redirect），不能自动完成 → 标"即将开放" |
| 密码哈希 | **node:crypto scrypt**（盐+64B dk，timingSafeEqual） | 零依赖、serverless 安全；不引 bcrypt/argon2（native 可能 serverless 不可用） |
| 会话 | httpOnly cookie `msid` = 32B 随机 token；KV `sess:<token>`→{userId,exp}；90 天；prod `secure` | 可服务端撤销；镜像 `/admin` 模式 |
| 用户存储 | 既有 KV：`user:<id>`={id,email,pwHash,createdAt,profile}；`uemail:<lower>`→id | 零新基建；内存兜底让本地/测试免外部服务 |
| 持久化内容 | profile = funnel 快照 {birth,birthForm,chart,firstRead,nickname,joinedAt} | 正是要搬离 localStorage 的那份数据 |
| 跨设备恢复 | 登录后 `/api/auth/me` 返回 profile → 客户端水合 funnel store → 进 /today | 兑现留存承诺的关键一环 |
| 活跃漏斗 | 保留低摩擦 guest 入口（仍 `data-testid="login"`，本地模式）+ 新增真注册/登录 | 不砍激活转化、不破现有 3 个 E2E |

## 3. 架构与数据流

```
注册:  /register 邮箱+密码 + 当前 funnel 快照
   → POST /api/auth/register {email,password,profile}
       邮箱已存在? → 409
       否则 createUser(scrypt hash) + 存 profile + 建 session + Set-Cookie msid
   → 客户端进 /today（已登录，数据已上云）

登录:  /register 切到登录 → 邮箱+密码
   → POST /api/auth/login → 验密码 → 建 session → 返回 {email, profile}
   → 客户端用 profile 水合 funnel store → /today（跨设备恢复）

每次开 app:  <AuthHydration/>
   → GET /api/auth/me → {email, profile} | 401
       已登录且本地 funnel 空 → 用 server profile 水合
       已登录且本地有更新的盘 → POST /api/auth/sync 推上去（本地优先）

登出:  POST /api/auth/logout → 删 session + 清 cookie
删号:  POST /api/auth/delete → 删 user/uemail/session + 清 cookie（设置页"删除我的盘"接到这里）
```

## 4. 组件（小而独立）

| 单元 | 职责 | 依赖 |
|---|---|---|
| `lib/server/auth.ts` | 纯函数层：`hashPassword/verifyPassword`、`createUser/findByEmail/getUser`、`createSession/getSession/revokeSession`、`saveProfile/deleteUser`。建在 KV 上 | store.ts KV, node:crypto |
| `lib/server/session.ts`（或并入 auth） | 从 Request cookie 读 `msid` → userId（带 lazy 过期检查） | auth.ts |
| `app/api/auth/register/route.ts` | 校验 email/password → createUser → session cookie → 201 | auth.ts |
| `app/api/auth/login/route.ts` | 验密码 → session → 返回 profile | auth.ts |
| `app/api/auth/logout/route.ts` | revokeSession + 清 cookie | auth.ts |
| `app/api/auth/me/route.ts` | 当前 session → {email,profile} \| 401 | auth.ts |
| `app/api/auth/sync/route.ts` | 已登录 → 存 profile 快照 | auth.ts |
| `app/api/auth/delete/route.ts` | deleteUser + 清 cookie | auth.ts |
| `lib/auth-client.ts` | 客户端 fetch 封装：register/login/logout/me/sync/deleteAccount | — |
| `components/AuthHydration.tsx` | 开 app 拉 /me，按"本地优先"规则水合/回推 | store, auth-client |
| `app/register/page.tsx` | 真邮箱/密码表单 + 登录切换 + 保留 guest | auth-client, store |
| `app/me/settings/page.tsx` | 登录方式行显示真 email + 退出登录；删除接 server | auth-client |

## 5. 边界与取舍（诚实标注）

- **邮箱唯一性竞态**：KV 无事务，`check-then-set` 理论上并发同邮箱可双写（后写覆盖 `uemail` 索引）。非安全漏洞，仅可能重复；MVP 规模可接受，记为后续用 Redis `SET NX` 收紧。
- **会话过期**：KV 抽象无 TTL 参数 → session 值内存 `exp` 时间戳，读时 lazy 校验过期（过期即视为未登录）。陈旧 key 滞留 KV，可接受；后续可加 Redis EX。
- **密码强度**：服务端最小校验（≥8 位、含字母）；不做邮箱验证邮件（MVP 无邮件服务）→ 邮箱真实性不验证，仅作唯一登录标识。记为后续。
- **本地优先水合**：若用户在 A 设备改了盘未同步、又在 B 设备登录，以"本地有更新盘则回推、否则拉服务端"避免静默覆盖。判据用 `joinedAt`/有无 chart，非完美合并；单人单盘场景足够。
- **cookie secure**：`secure: NODE_ENV==='production'`，localhost(http) 不破。
- **不碰**：Google/Apple OAuth（外部配置）、邮箱验证邮件、找回密码 → 均标"即将开放/后续"。

## 6. 测试方案

- `auth.test.ts`（lib，内存 KV）：hash/verify；createUser 唯一性（重复→报错）；findByEmail；login 错密码失败；session 建/读/撤销；过期 session 读为 null；saveProfile/getUser；deleteUser 后全清。
- 路由测试：register 201+Set-Cookie / 重复 409 / 弱密码 400；login 200+profile / 401；me 带 cookie 200 / 无 cookie 401；logout 清 cookie 后 me=401；sync 存盘后 me 能取回；delete 后 me=401 且 email 可再注册。
- E2E（新增 `e2e/auth.spec.ts`）：走漏斗→真邮箱注册→重开（清 localStorage 模拟新设备）→登录→/today 且盘恢复。保留现有 3 个 E2E（guest 路径不破）。
- 全量：tsc + vitest + next build + 起 dev server curl 真跑 register→me→logout→login→sync→delete（带 cookie jar）。

## 7. 验收标准

1. 新邮箱注册 → 201 + 写 httpOnly cookie；`/api/auth/me` 返回该 email + 刚存的 profile。
2. 同邮箱再注册 → 409。
3. 登出后 `/api/auth/me` → 401；cookie 已清。
4. 正确密码登录 → 200 + profile；错误密码 → 401。
5. 模拟新设备（清 localStorage、保留 cookie 或重登）→ 盘从服务端恢复，直接进 /today。
6. 删除账号 → 数据全清，`/api/auth/me`→401，同邮箱可再次注册。
7. 现有 3 个 E2E（guest 漏斗）仍绿；tsc/vitest/build 全绿。
8. 密码以 scrypt 哈希存储，KV 中无明文（抽查 user 记录）。
