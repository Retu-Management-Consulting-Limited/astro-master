#!/usr/bin/env node
// P1 guard — Tailwind v4 cascade-layer safety.
//
// WHY THIS EXISTS (incident 2026-06-16): the Money Mirror feature shipped to
// prod with no padding, no centering, and buttons rendered as plain text. Root
// cause: globals.css had UNLAYERED resets — `*{margin:0;padding:0}` and
// `button{background:none;border:none}` — written outside any @layer. Tailwind
// v4's `@import "tailwindcss"` puts every utility in `@layer utilities`, and per
// the CSS Cascade Layers spec an UNLAYERED declaration always beats a LAYERED
// one regardless of specificity. So those resets silently zeroed every
// `px-*`/`m*`/`mx-auto`/`border`/`bg-*`/`gap-*` utility on the elements they hit.
//
// THE RULE: in this Tailwind project, a global reset that targets the universal
// selector (in ANY form — `*`, `:where(*)`, `html *`, `[class]`, …) or a bare
// element (button, a, input, …) and sets a box-model / appearance property MUST
// live inside `@layer base { ... }` so utilities can win. This script fails the
// build/push when such a reset is found unlayered.
//
// Hardened 2026-06-16 after an adversarial review found bypasses (`:where(*)`,
// `all:unset`, `html *`, `[class]`, uppercase tags, the `gap`/`appearance`/`all`
// properties, string-literal braces, and other-file coverage). Dependency-free
// (no postcss) so it runs in a bare git hook / CI build step.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

// Properties a reset must not zero unlayered — each is backed by a Tailwind
// utility, so an unlayered reset on them overrides that utility. `all` is the
// nuclear case (all:unset/revert wipes everything).
const COLLIDING = /^(margin|padding|border|background|gap|inset|appearance|all|box-shadow|column-gap|row-gap)(-|$)/;

// type selectors that are legitimately styled globally and don't collide with
// how utilities are used on elements.
const EXEMPT_TYPES = new Set(["html", "body", ":root"]);

// at-rules whose bodies contain real style rules (recurse into them). Everything
// else (@keyframes/@font-face/@page/@property/…) holds descriptors, not selectors.
const GROUP_ATRULES = /^@(layer|media|supports|container|scope)\b/i;

// Replace the *contents* of string literals with spaces (keep quotes + length +
// newlines) so braces/semicolons/colons inside `content:"{"` can't desync the
// structural scan. Comments are blanked the same way.
function neutralize(css) {
  let out = "";
  let i = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      out += "  ";
      i += 2;
      while (i < n && !(css[i] === "*" && css[i + 1] === "/")) { out += css[i] === "\n" ? "\n" : " "; i++; }
      out += "  "; i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      out += c; i++;
      while (i < n && css[i] !== c) {
        if (css[i] === "\\") { out += "  "; i += 2; continue; }
        out += css[i] === "\n" ? "\n" : " "; i++;
      }
      if (i < n) { out += css[i]; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

// Parse into a flat list of style rules, each tagged with whether any ancestor
// is an @layer block. `scan` is the neutralized copy used for structure; raw
// declarations are sliced from it (string contents already blanked, which is
// fine — we only look at property names).
function parseRules(scan) {
  const rules = [];
  const n = scan.length;
  const lineAt = (idx) => { let l = 1; for (let k = 0; k < idx && k < n; k++) if (scan[k] === "\n") l++; return l; };

  function walk(start, end, layered) {
    let p = start;
    while (p < end) {
      if (/\s/.test(scan[p])) { p++; continue; }
      let j = p;
      while (j < end && scan[j] !== "{" && scan[j] !== ";") j++;
      const prelude = scan.slice(p, j).trim();
      if (j >= end || scan[j] === ";") { p = j + 1; continue; } // @import/@charset/@layer a,b; etc.
      let depth = 1, k = j + 1;
      while (k < end && depth > 0) { if (scan[k] === "{") depth++; else if (scan[k] === "}") { depth--; if (depth === 0) break; } k++; }
      const bodyStart = j + 1, bodyEnd = k;
      if (prelude.startsWith("@")) {
        if (GROUP_ATRULES.test(prelude)) walk(bodyStart, bodyEnd, layered || /^@layer\b/i.test(prelude));
        // non-group at-rules (@keyframes/@font-face/…): do not scan their bodies as style rules.
      } else {
        rules.push({ selector: prelude, decls: scan.slice(bodyStart, bodyEnd), line: lineAt(p), layered });
      }
      p = k + 1;
    }
  }
  walk(0, n, false);
  return rules;
}

// Strip functional pseudo-classes that don't change the matched subject's
// breadth for our purposes — :where()/:is()/:not()/:has()/:matches() — and keep
// their inner selectors so `:where(*)` is seen as `*`.
function unwrapPseudo(sel) {
  let s = sel, prev;
  do { prev = s; s = s.replace(/:(where|is|matches|any|not|has)\(([^()]*)\)/gi, " $2 "); } while (s !== prev);
  return s;
}

function isBroadResetSelector(selector) {
  return selector.split(",").some((raw) => {
    const part = unwrapPseudo(raw).trim();
    if (!part) return false;
    if (/(^|[\s>+~|])\*/.test(part)) return true;                 // universal anywhere: *, html *, *|*, * + *
    if (/(^|[\s>+~])\[[^\]]+\]/.test(part)) return true;          // attribute-only compound: [class], [data-x]
    for (const compound of part.split(/[\s>+~]+/).filter(Boolean)) {
      const m = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(compound);
      if (!m) continue;
      const rest = compound.slice(m[1].length);
      const bareType = rest === "" || /^(::?[a-zA-Z-]+(\([^)]*\))?)+$/.test(rest); // tag, tag::before, a:hover
      if (bareType && !EXEMPT_TYPES.has(m[1].toLowerCase())) return true;
    }
    return false;
  });
}

function collidingProps(decls) {
  return decls
    .split(";")
    .map((d) => d.split(":")[0].trim().toLowerCase())
    .filter((p) => COLLIDING.test(p));
}

function cssFilesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...cssFilesUnder(full));
    else if (name.endsWith(".css")) out.push(full);
  }
  return out;
}

const violations = [];
let scanned = 0;
for (const abs of cssFilesUnder(SRC)) {
  scanned++;
  const scan = neutralize(readFileSync(abs, "utf8"));
  for (const rule of parseRules(scan)) {
    if (rule.layered) continue;
    if (!isBroadResetSelector(rule.selector)) continue;
    const props = collidingProps(rule.decls);
    if (props.length) violations.push({ file: relative(ROOT, abs), line: rule.line, selector: rule.selector.replace(/\s+/g, " ").slice(0, 60), props });
  }
}

if (violations.length) {
  console.error("✗ [css-layers] Unlayered reset(s) override Tailwind @layer utilities.");
  console.error("  Fix: move the rule INTO `@layer base { ... }` so utilities win.\n");
  for (const v of violations) console.error(`  ${v.file}:${v.line}  "${v.selector}"  sets [${v.props.join(", ")}] unlayered`);
  console.error("\n  See scripts/check-css-layers.mjs header for the 2026-06-16 incident.");
  process.exit(1);
}
console.log(`✓ [css-layers] ${scanned} stylesheet(s) clean — no unlayered box-model/appearance resets.`);
