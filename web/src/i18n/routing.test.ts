import { describe, it, expect } from "vitest";
import { routing } from "./routing";

describe("i18n routing", () => {
  it("supports zh + ru with zh default and as-needed prefix", () => {
    expect(routing.locales).toEqual(["zh", "ru"]);
    expect(routing.defaultLocale).toBe("zh");
    expect(routing.localePrefix).toBe("as-needed");
  });
});
