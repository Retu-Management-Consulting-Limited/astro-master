#!/usr/bin/env node
// i18n guard (build/CI) — dependency-free mirror of the two vitest guards so
// the messages contract is enforced at build time, not only under the test
// runner. Two checks:
//
//   (1) key-parity: messages/zh/**.json と messages/ru/**.json must expose the
//       exact same set of namespace files AND the exact same key paths inside
//       each. A missing key on either side = a UI string that silently falls
//       back to the other language at runtime → 中俄混排（承重风险 1/3）。
//
//   (2) no-CJK (cleaned list): the files that have already been migrated to
//       next-intl must not regress to a hardcoded Chinese literal. Progressive
//       allowlist: Task 1 seeds the proven-clean files; Tasks 2–9 append theirs;
//       Task 10 flips I18N_FULL_SCAN=1 (or this list grows to everything).
//
// Comments and lines carrying the `i18n-allow-cjk` marker are exempt (e.g. a
// language's own name "中文" in LocaleSwitcher).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const MESSAGES = join(ROOT, "messages");
const CJK = /[一-鿿㐀-䶿]/;
const ALLOW_MARKER = "i18n-allow-cjk";

// Task 10 收口：全量扫描成为永久默认。所有 UI 文件已抽取，no-CJK 现对整个
// src/app + src/components 强制（C 区除外）。设 I18N_FULL_SCAN=0 可临时回退到
// 清单模式（仅用于调试）。
const FULL_SCAN = process.env.I18N_FULL_SCAN !== "0";

// 渐进模式（已废弃，仅 I18N_FULL_SCAN=0 调试时用）的历史清单。
const CLEANED_FILES = [
  "src/components/TabBar.tsx",
  "src/app/[locale]/layout.tsx",
  "src/app/[locale]/not-found.tsx",
  "src/app/[locale]/error.tsx",
  "src/app/layout.tsx",
];

const C_ZONE_PREFIXES = ["src/lib/ai/", "src/lib/reading/", "src/app/api/"];
const isCZone = (rel) => C_ZONE_PREFIXES.some((p) => rel.replaceAll("\\", "/").startsWith(p));

// ---- (1) key-parity ----
function keyPaths(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...keyPaths(v, path));
    else out.push(path);
  }
  return out.sort();
}

function loadNs(locale) {
  const dir = join(MESSAGES, locale);
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    out[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(dir, f), "utf8"));
  }
  return out;
}

function checkParity() {
  const zh = loadNs("zh");
  const ru = loadNs("ru");
  const errors = [];

  const zhNs = Object.keys(zh).sort();
  const ruNs = Object.keys(ru).sort();
  if (JSON.stringify(zhNs) !== JSON.stringify(ruNs)) {
    errors.push(`namespace 文件集合不一致: zh=[${zhNs}] ru=[${ruNs}]`);
  }
  for (const ns of zhNs) {
    if (!ru[ns]) continue;
    const a = keyPaths(zh[ns]);
    const b = keyPaths(ru[ns]);
    const onlyZh = a.filter((k) => !b.includes(k));
    const onlyRu = b.filter((k) => !a.includes(k));
    if (onlyZh.length) errors.push(`[${ns}] 仅 zh 有: ${onlyZh.join(", ")}`);
    if (onlyRu.length) errors.push(`[${ns}] 仅 ru 有: ${onlyRu.join(", ")}`);
  }
  return errors;
}

// ---- (2) no-CJK ----
function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let inStr = null;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") { out += c2 ?? ""; i += 2; continue; }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; out += c; i++; continue; }
    if (c === "/" && c2 === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && c2 === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
    out += c;
    i++;
  }
  return out;
}

function cjkOffenders(rel) {
  const raw = readFileSync(join(ROOT, rel), "utf8");
  const strippedLines = stripComments(raw).split("\n");
  const rawLines = raw.split("\n");
  const out = [];
  for (let i = 0; i < strippedLines.length; i++) {
    if (!CJK.test(strippedLines[i])) continue;
    if (rawLines[i]?.includes(ALLOW_MARKER)) continue;
    out.push(`${rel}:${i + 1}  ${rawLines[i]?.trim() ?? ""}`);
  }
  return out;
}

function tsxFilesUnder(relDir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, relDir))) {
    const childRel = `${relDir}/${name}`;
    const st = statSync(join(ROOT, childRel));
    if (st.isDirectory()) out.push(...tsxFilesUnder(childRel));
    else if (name.endsWith(".tsx") && !name.endsWith(".test.tsx")) out.push(childRel);
  }
  return out;
}

function checkNoCjk() {
  let files;
  if (FULL_SCAN) {
    files = [...tsxFilesUnder("src/app"), ...tsxFilesUnder("src/components")].filter(
      (f) => !isCZone(f),
    );
  } else {
    files = CLEANED_FILES;
  }
  const errors = [];
  for (const rel of files) {
    if (isCZone(rel)) continue;
    errors.push(...cjkOffenders(rel));
  }
  return errors;
}

// ---- run ----
const parityErrors = checkParity();
const cjkErrors = checkNoCjk();

if (parityErrors.length || cjkErrors.length) {
  if (parityErrors.length) {
    console.error("✗ [i18n] message key-parity 失败（zh ↔ ru 键路径不对齐）：");
    for (const e of parityErrors) console.error(`  ${e}`);
  }
  if (cjkErrors.length) {
    console.error(`✗ [i18n] no-CJK 失败（${FULL_SCAN ? "全量" : "已清理清单"} 内有残留中文 UI 字面量）：`);
    for (const e of cjkErrors) console.error(`  ${e}`);
  }
  console.error("\n  见 scripts/check-i18n.mjs 头注 + docs 计划。");
  process.exit(1);
}

const ZH = loadNs("zh");
console.log(
  `✓ [i18n] key-parity ok（${Object.keys(ZH).length} namespaces）· no-CJK ok（${
    FULL_SCAN ? "全量扫描" : `${CLEANED_FILES.length} 已清理文件`
  }）`,
);
void relative;
