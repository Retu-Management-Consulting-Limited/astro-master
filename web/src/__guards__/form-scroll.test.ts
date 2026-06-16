import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// GATE — 全屏页里「吸底提交按钮」(marginTop:auto) 必须有可滚动容器 (overflowY:auto) 兜底。
// 病根（任务级，属性扫描看不见）：安卓软键盘弹起会压缩 viewport；若内容容器没有
// overflowY:auto，被 marginTop:auto 吸到底的提交按钮会被键盘永久遮挡、滚不到、点不到，
// 表单提交任务直接断头。me/birth 就是五个表单页里唯一漏掉滚动容器的那个。
// 规则：page.tsx 同时（有输入框 → 会弹键盘）且（有 marginTop:"auto" 吸底元素）
// → 必须有 overflowY:"auto" 滚动容器。无输入框的页（如 landing）不弹键盘，不纳管。
// 新表单页自动纳管，无需维护清单。

const APP_DIR = join(__dirname, "..", "app");

function listPages(dir: string, route = ""): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listPages(full, route + (name.startsWith("(") ? "" : `/${name}`)));
    } else if (name === "page.tsx") {
      out.push({ route: route || "/", file: full });
    }
  }
  return out;
}

const hasStickyBottom = (src: string) => /marginTop:\s*["']auto["']/.test(src);
const hasScrollContainer = (src: string) => /overflowY:\s*["']auto["']/.test(src);
const hasInput = (src: string) => /<input\b|field-inp/.test(src); // 会弹软键盘的页

describe("form-scroll guard：吸底按钮页必须有滚动容器（防安卓键盘遮挡提交键）", () => {
  const sticky = listPages(APP_DIR).filter((p) => {
    const src = readFileSync(p.file, "utf8");
    return hasInput(src) && hasStickyBottom(src);
  });

  it.each(sticky)(
    "$route 有 marginTop:auto 吸底元素 → 必须有 overflowY:auto 滚动容器",
    ({ route, file }) => {
      expect(
        hasScrollContainer(readFileSync(file, "utf8")),
        `${route} 有吸底元素却没有滚动容器：安卓软键盘弹起时吸底按钮会被遮挡、够不到、提交不了。` +
          `\n给内容容器加 minHeight:0, overflowY:"auto"（对齐 input/register 等表单页）。`,
      ).toBe(true);
    },
  );
});
