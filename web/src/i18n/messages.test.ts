import { describe, it, expect } from "vitest";
import { loadMessages } from "./messages";

// Task 7: metadata / not-found / error localization message contract.
// Both locales must expose the new namespaces with parallel keys so that
// generateMetadata + the localized not-found/error pages never fall back to
// a missing-key error at build/runtime. After the per-namespace refactor
// (Task 1) these read through the merged loader rather than a single JSON.

const zh = loadMessages("zh");
const ru = loadMessages("ru");

describe("i18n messages: Task 7 namespaces", () => {
  it("zh exposes meta.title/description", () => {
    expect(zh.meta?.title).toBeTruthy();
    expect(zh.meta?.description).toBeTruthy();
  });

  it("ru exposes meta.title/description", () => {
    expect(ru.meta?.title).toBeTruthy();
    expect(ru.meta?.description).toBeTruthy();
  });

  it("zh exposes notFound.{title,body,cta}", () => {
    expect(zh.notFound?.title).toBeTruthy();
    expect(zh.notFound?.body).toBeTruthy();
    expect(zh.notFound?.cta).toBeTruthy();
  });

  it("ru exposes notFound.{title,body,cta}", () => {
    expect(ru.notFound?.title).toBeTruthy();
    expect(ru.notFound?.body).toBeTruthy();
    expect(ru.notFound?.cta).toBeTruthy();
  });

  it("zh exposes error.{title,body,retry}", () => {
    expect(zh.error?.title).toBeTruthy();
    expect(zh.error?.body).toBeTruthy();
    expect(zh.error?.retry).toBeTruthy();
  });

  it("ru exposes error.{title,body,retry}", () => {
    expect(ru.error?.title).toBeTruthy();
    expect(ru.error?.body).toBeTruthy();
    expect(ru.error?.retry).toBeTruthy();
  });

  it("zh keeps original Chinese copy verbatim", () => {
    // 宪法 §8 + 计划：zh 文案逐字保留原文。
    expect(zh.notFound?.title).toBe("这片星空，是空的");
    expect(zh.error?.title).toBe("星图转动时卡了一下");
  });
});
