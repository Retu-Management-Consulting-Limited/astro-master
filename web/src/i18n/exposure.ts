import { routing, type AppLocale } from "./routing";

// RU_PUBLIC 开关 —— 承接 Kevin「俄语暂不对用户开」决策。
//
// 生产默认关：俄语全部建好但不向用户暴露——LocaleSwitcher 不列 ru、手动访问
// /ru/* 被 proxy 重定向回默认 locale（剥前缀）。母语复核通过后，生产置
// NEXT_PUBLIC_RU_PUBLIC=1 即开放，无需改码。
//
// 测试/CI 开：playwright.config 与 vitest 设 NEXT_PUBLIC_RU_PUBLIC=1，使 ru
// 的 e2e/单测仍能验证 /ru。
//
// 注：用 NEXT_PUBLIC_ 前缀 → 客户端可读（LocaleSwitcher 是 client 组件）。
// 直接读 process.env.NEXT_PUBLIC_RU_PUBLIC 而非缓存到模块常量，因为 Next 在
// 构建时把 NEXT_PUBLIC_* 内联成字面量；函数形态保证 server 与 client 一致。

/** ru 是否对用户暴露（非默认 locale 的「受闸」语言总集合的判据）。 */
export function ruEnabled(): boolean {
  return process.env.NEXT_PUBLIC_RU_PUBLIC === "1";
}

/**
 * 当前应向用户暴露的 locale 列表。
 * 默认 locale 永远在内；ru 仅在开关打开时加入。
 * 将来若增更多受闸语言，在此按各自开关扩展。
 */
export function publicLocales(): AppLocale[] {
  return routing.locales.filter(
    (l) => l === routing.defaultLocale || (l === "ru" && ruEnabled()),
  );
}

/** 某 locale 当前是否允许对用户暴露。 */
export function isLocalePublic(locale: string): boolean {
  return (publicLocales() as string[]).includes(locale);
}
