import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ---- no-CJK-in-UI guard ----
//
// 承重风险 1：抽串不全 → 切到 ru 后界面仍冒中文（中俄混排）。本 guard 扫
// src/app + src/components 的 .tsx，断言「已清理」文件里不再有未抽取的 CJK
// 字面量。
//
// 渐进启用（清单递减模式）：messages 抽取分 8 个并行任务做，不可能一次清空。
// 故本 guard 接受一个 CLEANED_FILES 清单 —— 只对清单内文件强制无 CJK。
//   - Task 1（本任务）：清单 = 已 i18n 的少数文件（TabBar、locale layout/
//     not-found/error）。
//   - Task 2–9：各任务清理完自己的文件后，把文件加进清单。
//   - Task 10（收口）：清单 = 全部，或直接切到「全量扫描」模式（设
//     FULL_SCAN=true），删清单参数变全量断言。
//
// 排除：
//   - 注释（行 // 与块 /* */、JSX {/* */}）—— 注释里的中文是给开发者看的。
//   - 行内豁免标记 `i18n-allow-cjk` —— 用于「该语言自身的名字必须用该语言
//     书写」这类合法字面量（如 LocaleSwitcher 的语言名 "中文"）。
//   - C 区路径（src/lib/ai、src/lib/reading、src/app/api 下的确定性 Molly
//     内容表）—— 属子项目 C，B 不碰。本 guard 只看 app/components 的 .tsx，
//     天然不含 src/lib/* 与 api；保留常量以备将来扩展扫描面。

const WEB_ROOT = join(__dirname, "..", "..");

// 切到 true → 忽略 CLEANED_FILES 清单，对整个 app+components 全量断言无 CJK。
// Task 10 收口时打开（或删清单参数）。
const FULL_SCAN = process.env.I18N_FULL_SCAN === "1";

// 已清理、必须保持无 CJK 的文件（相对 web/ 根）。后续任务往这里追加。
const CLEANED_FILES: string[] = [
  "src/components/TabBar.tsx",
  "src/app/[locale]/layout.tsx",
  "src/app/[locale]/not-found.tsx",
  "src/app/[locale]/error.tsx",
  "src/app/layout.tsx",
  // T2: input + forms
  "src/app/[locale]/input/page.tsx",
  "src/components/BirthDateField.tsx",
  // T3: chart + me
  "src/app/[locale]/chart/page.tsx",
  "src/app/[locale]/me/page.tsx",
  "src/app/[locale]/me/birth/page.tsx",
  "src/app/[locale]/me/settings/page.tsx",
  // T4: today + components.todayCell
  "src/app/[locale]/today/page.tsx",
  "src/components/TodayCell.tsx",
  // T5: chat + MollyThinking
  "src/app/[locale]/chat/page.tsx",
  "src/components/MollyThinking.tsx",
];

// C 区前缀（即便将来扩大扫描面也绝不检查 —— 属子项目 C）。
const C_ZONE_PREFIXES = ["src/lib/ai/", "src/lib/reading/", "src/app/api/"];

const CJK = /[一-鿿㐀-䶿]/;
const ALLOW_MARKER = "i18n-allow-cjk";

/** 去掉注释，便于只在「可见 UI 字面量」上检测 CJK。 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  let inStr: string | null = null; // ' " `
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") {
        out += c2 ?? "";
        i += 2;
        continue;
      }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    // 进入字符串字面量（保留其内容供检测）
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      out += c;
      i++;
      continue;
    }
    // 行注释
    if (c === "/" && c2 === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    // 块注释（含 JSX {/* ... */} 里的 /* ... */）
    if (c === "/" && c2 === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** 返回文件中含未豁免 CJK 的行（已去注释；行内带 ALLOW_MARKER 的跳过）。 */
function cjkOffenders(absPath: string): { line: number; text: string }[] {
  const raw = readFileSync(absPath, "utf8");
  const stripped = stripComments(raw);
  const rawLines = raw.split("\n");
  const strippedLines = stripped.split("\n");
  const out: { line: number; text: string }[] = [];
  for (let i = 0; i < strippedLines.length; i++) {
    if (!CJK.test(strippedLines[i])) continue;
    // 原始行里有豁免标记 → 合法 native-script 字面量，放行。
    if (rawLines[i]?.includes(ALLOW_MARKER)) continue;
    out.push({ line: i + 1, text: rawLines[i]?.trim() ?? "" });
  }
  return out;
}

function isCZone(rel: string): boolean {
  return C_ZONE_PREFIXES.some((p) => rel.replace(/\\/g, "/").startsWith(p));
}

/** 递归收集某目录下的 .tsx（排除 .test.tsx），返回相对 web/ 根路径。 */
function tsxFilesUnder(relDir: string): string[] {
  const out: string[] = [];
  const abs = join(WEB_ROOT, relDir);
  for (const name of readdirSync(abs)) {
    const childRel = `${relDir}/${name}`;
    const st = statSync(join(WEB_ROOT, childRel));
    if (st.isDirectory()) out.push(...tsxFilesUnder(childRel));
    else if (name.endsWith(".tsx") && !name.endsWith(".test.tsx")) out.push(childRel);
  }
  return out;
}

describe("no-cjk-in-ui guard", () => {
  if (FULL_SCAN) {
    // Task 10 收口模式：全量扫 app+components 的 .tsx（排除 .test.tsx 与 C 区）。
    it("FULL SCAN: app+components 的 .tsx 无残留 UI CJK", () => {
      const files = [...tsxFilesUnder("src/app"), ...tsxFilesUnder("src/components")]
        .filter((f) => !isCZone(f));
      const failures: string[] = [];
      for (const rel of files) {
        const off = cjkOffenders(join(WEB_ROOT, rel));
        for (const o of off) failures.push(`${rel}:${o.line}  ${o.text}`);
      }
      expect(failures, `\n${failures.join("\n")}`).toEqual([]);
    });
    return;
  }

  // 渐进模式：只对已清理清单强制。
  it("CLEANED_FILES 都不在 C 区", () => {
    for (const f of CLEANED_FILES) expect(isCZone(f)).toBe(false);
  });

  for (const rel of CLEANED_FILES) {
    it(`已清理文件无残留 UI CJK: ${rel}`, () => {
      const off = cjkOffenders(join(WEB_ROOT, rel));
      const report = off.map((o) => `  ${rel}:${o.line}  ${o.text}`).join("\n");
      expect(off, `\nresidual CJK:\n${report}`).toEqual([]);
    });
  }
});

// 自检：守护器本身不能是假绿灯 —— 给它一段含未豁免 CJK 的样本，必须能抓出；
// 含 ALLOW_MARKER 的样本必须放行；注释里的 CJK 必须放行。
describe("no-cjk-in-ui guard · 自检（防假绿灯）", () => {
  function detect(src: string): boolean {
    const stripped = stripComments(src);
    const rawLines = src.split("\n");
    const sLines = stripped.split("\n");
    for (let i = 0; i < sLines.length; i++) {
      if (CJK.test(sLines[i]) && !rawLines[i]?.includes(ALLOW_MARKER)) return true;
    }
    return false;
  }

  it("抓出可见字面量里的 CJK", () => {
    expect(detect(`const x = "今日";`)).toBe(true);
  });
  it("放行行注释里的 CJK", () => {
    expect(detect(`const x = "today"; // 今日`)).toBe(false);
  });
  it("放行块注释里的 CJK", () => {
    expect(detect(`/* 今日 */ const x = "today";`)).toBe(false);
  });
  it("放行带 i18n-allow-cjk 标记的字面量（语言自名）", () => {
    expect(detect(`const L = { zh: "中文" }; /* ${ALLOW_MARKER} */`)).toBe(false);
  });
  it("仅 ASCII 不误报", () => {
    expect(detect(`const x = t("today");`)).toBe(false);
  });
});

// relative 仅用于潜在调试输出；保留 import 引用避免 lint 噪音。
void relative;
