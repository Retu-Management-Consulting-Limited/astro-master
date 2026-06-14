import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "./sanitize";

describe("sanitizeRichText (X-1 allowlist)", () => {
  it("keeps light formatting tags", () => {
    expect(sanitizeRichText("看<b>这里</b>和<i>那里</i><br>下一行")).toBe("看<b>这里</b>和<i>那里</i><br>下一行");
  });
  it("drops img/script/iframe and any non-allowlisted tag", () => {
    expect(sanitizeRichText('<img src=x onerror="alert(1)">x')).toBe("x");
    expect(sanitizeRichText("<script>alert(1)</script>hi")).toBe("hi");
    expect(sanitizeRichText('<a href="javascript:alert(1)">链接</a>')).toBe("链接");
    expect(sanitizeRichText("<div onclick=evil()>x</div>")).toBe("x");
  });
  it("strips ALL attributes from allowed tags (kills inline handlers)", () => {
    expect(sanitizeRichText('<b onmouseover="alert(1)" style="x">hi</b>')).toBe("<b>hi</b>");
  });
  it("handles empty/undefined", () => {
    expect(sanitizeRichText("")).toBe("");
    // @ts-expect-error runtime guard for null
    expect(sanitizeRichText(null)).toBe("");
  });
});
