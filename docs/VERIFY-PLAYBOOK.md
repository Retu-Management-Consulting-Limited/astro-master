# 验证手法 Playbook（别再重复摸索）

> 沉淀自 2026-06-15「换了一天还一样」一役。两类验证以前每次都临时摸索，这里固化。
> 配套规则见 `design/DESIGN-SYSTEM.md §15`（R14–R15 动态内容契约）。

## A. 验证「按天 / 动态内容」是否真的会变（开发期）

**核心：别信代理指标，验呈现层。** `useNow` 那次只验证了「日期会滚动」（代理），没验证「内容会变」（目标），于是内容连日冻结溜过去了。

1. **先跑一次性 probe，肉眼连看多天**——别推理「应该会变」：
   ```bash
   # 必须在 web/ 目录内跑（要解析 @/ 别名 + 相对 import）；临时文件用完即删
   cd web && cat > ./_probe.ts <<'EOF'
   import { computeChart } from "./src/lib/astro/chart";
   import { dailyReading } from "./src/lib/reading/daily";
   const chart = computeChart({ year:1990, month:7, day:15, hour:14, minute:30, lat:31.23, lng:121.47, tz:8 });
   for (let i=0;i<7;i++){
     const d=new Date(Date.UTC(2026,5,10+i,1,0));
     console.log(d.toISOString().slice(0,10), dailyReading(chart,d).todayLine);
   }
   EOF
   /Users/ddd/.bun/bin/bun ./_probe.ts; rm -f ./_probe.ts
   ```
2. **永久化为强断言**——在 `web/src/__guards__/content-freshness.test.ts` 登记：
   - 按天面 → **相邻日 `not.toBe`**（不是 `Set(...).size>1`，那是假绿灯）
   - 个性化面 → 两个明显不同的盘 `not.toBe`
   - 配对面 → 两个不同配对 `not.toBe`
3. CI 已跑 vitest，登记后即被强制；新动态面**必须**在该文件加一条强断言。

## B. 验证某次改动是否真的上了生产（无需 vercel CLI）

`vercel` CLI 不一定在 PATH。不靠它也能确认线上构建包含某次改动：

```bash
cd /tmp
curl -s https://vapeincity.com/today -o t.html
grep -oE '/_next/static/chunks/[^"]+\.js' t.html | sort -u > ch.txt
# 对每个 chunk grep「只在新代码出现的字符串签名」
for sig in "这阵子" "慢下来不丢人" "backdropLine"; do
  while read -r c; do curl -s "https://vapeincity.com$c" | grep -q "$sig" && { echo "OK  $sig  $c"; break; }; done < ch.txt
done
```

- **选签名**：挑改动里**新增、且压缩后仍保留**的字符串——中文文案、事件名（`pageshow`/`visibilitychange`）、对象字段名。**别**选会被 minify 改名的局部变量/函数名。
- chunk 文件名是 content-hash；**hash 变了**也佐证是全新构建。
- 反向用法：grep 一个**只在旧代码**出现的字符串确认它已消失。

## 已知操作坑

- **Bash cwd 会在调用间重置到非 git 父目录**（`~/Documents/Claude`，不是 repo）。每条 git/构建命令前显式 `cd /Users/ddd/Documents/Claude/astro-master`（或 `web`）。
- **vercel** 在 `/Users/ddd/.bun/bin/vercel`，链接项目根是 `web/`；部署是对外动作，跑前先确认。
- **PWA 缓存**：服务端换了新 chunk（新 hash），但已安装的 PWA 其 service worker 可能仍发旧 chunk → 关掉重开拉新版。浏览器直连一般已是新版。
- **main 受保护**：任何改动（含纯文档）只能开分支 → PR → CI 绿 → 合，不能直推。
