import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// GATE — 承重地基：locale 必须一路串到每个 LLM 调用点。
//
// 病根（计划 §承重风险 1）：locale 漏传任一 runLLM 调用点 → 俄语页面冒中文解读
// （中俄混出）。最易漏：followups（嵌套两层、独立 route）、narrative 的 SYSTEM
// 常量、synastry 的 facts() 调用。静态扫描容易"看着对实则漏"，故把"每个调用点
// 都接 locale"从靠自觉升级成机器强制：任何 route 改动漏掉 locale 串接 → 本测试
// 红 → CI 拦下。
//
// 校验思路（静态源码扫描，不依赖运行 LLM）：
//   1. runLLM 签名必须接收 locale 形参。
//   2. 每个 route 的 POST 必须从 body 解析 locale 并经 hasLocale 校验回退。
//   3. 每个 route 调用 runLLM 时，传入的 prompt 构建器 + system + runLLM 本身
//      都必须收到那个被校验过的 locale。
//   4. client remote.ts 的每个解读类 fetch body 必须带 locale。

const WEB = process.cwd();
const read = (rel: string) => readFileSync(join(WEB, rel), "utf8");

// 把字符串里的空白折叠，便于跨行匹配 runLLM(...) 调用参数。
const flat = (s: string) => s.replace(/\s+/g, " ");

describe("llm-locale-threaded GATE", () => {
  it("runLLM 签名接收 locale", () => {
    const src = read("src/lib/ai/llm.ts");
    // 形如 export async function runLLM(..., locale: AppLocale, ...)
    expect(/export async function runLLM\([^)]*locale\s*:/.test(flat(src))).toBe(true);
    // 必须 import AppLocale 类型
    expect(/AppLocale/.test(src)).toBe(true);
  });

  // 6 个 LLM 调用点所在的 route 文件。
  const routes: { file: string; builders: string[] }[] = [
    // reading：firstPrompt + themePrompt 两个构建器共用一个 route
    { file: "src/app/api/reading/route.ts", builders: ["firstPrompt", "themePrompt", "personaFor", "facts"] },
    { file: "src/app/api/chat/route.ts", builders: ["chatPrompt", "chatSystem", "facts"] },
    { file: "src/app/api/synastry/reading/route.ts", builders: ["synPrompt", "personaFor", "facts"] },
    { file: "src/app/api/chat/followups/route.ts", builders: ["buildFollowupPrompt", "facts"] },
    { file: "src/app/api/narrative/route.ts", builders: ["buildPrompt", "facts"] },
  ];

  for (const { file, builders } of routes) {
    describe(file, () => {
      const src = read(file);
      const f = flat(src);

      it("从 body 解析 locale 并 hasLocale 校验回退 defaultLocale", () => {
        expect(/locale\??\s*:/.test(f) && /body\.locale|\blocale\b/.test(f)).toBe(true);
        // 必须用 hasLocale 校验（非法回退默认 locale），不可裸用 body.locale。
        expect(/hasLocale\s*\(/.test(f)).toBe(true);
        expect(/defaultLocale|routing\.defaultLocale/.test(f)).toBe(true);
      });

      it("每次 runLLM 调用都把 locale 串入", () => {
        // 抓出所有 runLLM(...) 实参串，逐个断言含 locale。
        const calls = [...f.matchAll(/runLLM\s*\(([^;]*?)\)\s*[;,)]/g)].map((m) => m[1]);
        // 也兼容 await runLLM(...) 末尾换行的形态
        const calls2 = [...f.matchAll(/runLLM\s*\(([\s\S]*?)\)\s*;/g)].map((m) => m[1]);
        const all = [...calls, ...calls2];
        expect(all.length).toBeGreaterThan(0);
        for (const args of all) {
          expect(args.includes("locale")).toBe(true);
        }
      });

      it("prompt/persona/facts 构建器收到 locale", () => {
        for (const b of builders) {
          // 构建器在本文件被调用时，其调用串里必须含 locale 实参。
          const re = new RegExp(`${b}\\s*\\(([^;]*?)\\)`, "g");
          const calls = [...f.matchAll(re)].map((m) => m[1]);
          // 该 route 不一定调用每个 builder（如 reading 不调 chatPrompt）；
          // 仅对实际出现的调用断言。
          if (calls.length === 0) continue;
          for (const args of calls) {
            expect(args.includes("locale"), `${b} 调用未串 locale (${file})`).toBe(true);
          }
        }
      });
    });
  }

  it("client remote.ts 所有解读类 fetch body 带 locale", () => {
    const src = read("src/lib/reading/remote.ts");
    const f = flat(src);
    // 必须有取当前 locale 的辅助
    expect(/currentLocale\s*\(/.test(f) || /useLocale|NEXT_LOCALE|location\.pathname/.test(f)).toBe(true);
    // 每个解读类请求 body 应含 locale。两种形态：
    //   • JSON.stringify({...})   — synastry/chat/followups 直接 fetch
    //   • post({...})             — reading first/theme 经共用 post() 辅助
    const stringified = [...f.matchAll(/JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/g)].map((m) => m[1]);
    const posted = [...f.matchAll(/\bpost\(\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
    const bodies = [...stringified, ...posted];
    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) {
      expect(b.includes("locale"), `fetch body 漏 locale: ${b.slice(0, 80)}`).toBe(true);
    }
  });
});
