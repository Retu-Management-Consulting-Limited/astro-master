import { describe, it, expect } from "vitest";
import { NAMESPACES, loadMessages } from "@/i18n/messages";

// i18n guard: every key path present in zh must exist in ru and vice-versa.
// A missing key on either side = a UI string that silently falls back to the
// other language at runtime → 中俄混排. Per-namespace files make this easy to
// drift (one task forgets the ru side), so this guard runs in CI.

function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...keyPaths(v as Record<string, unknown>, path));
    } else {
      out.push(path);
    }
  }
  return out.sort();
}

const zh = loadMessages("zh");
const ru = loadMessages("ru");

describe("message-key-parity: zh ↔ ru", () => {
  it("exposes the same set of namespaces on both locales", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(ru).sort());
  });

  it("declares every namespace in the NAMESPACES manifest", () => {
    expect(Object.keys(zh).sort()).toEqual([...NAMESPACES].sort());
    expect(Object.keys(ru).sort()).toEqual([...NAMESPACES].sort());
  });

  for (const ns of NAMESPACES) {
    it(`namespace "${ns}" has identical key paths in zh and ru`, () => {
      const zhKeys = keyPaths(zh[ns]);
      const ruKeys = keyPaths(ru[ns]);
      expect(ruKeys).toEqual(zhKeys);
    });
  }

  it("flat full-bundle key paths are identical (no orphan keys anywhere)", () => {
    expect(keyPaths(ru as Record<string, unknown>)).toEqual(
      keyPaths(zh as Record<string, unknown>),
    );
  });
});
