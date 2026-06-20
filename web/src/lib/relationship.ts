// Honest elapsed-time helpers — no fabricated "一年前的今天" for a day-1 user.
import type { AppLocale } from "@/i18n/routing";
import { currentLocale } from "./reading/locale";

const DAY = 86400000;

export function daysSince(joinedAt?: number): number {
  if (!joinedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - joinedAt) / DAY));
}

// ru — 忠实镜像：«今天遇见»=«Встретились сегодня»，«认识 N 天»=«Знакомы N дн.»。
// 用 «дн.» 缩写避开俄语 1/2-4/5+ 的复数变格（день/дня/дней），与 zh 简洁同重。
// zh 分支逐字不变（locale!=='ru' 时）。
export function metLabel(joinedAt?: number, locale: AppLocale = currentLocale()): string {
  const d = daysSince(joinedAt);
  if (locale === "ru") {
    if (!joinedAt || d === 0) return "Встретились сегодня";
    return `Знакомы ${d} дн.`;
  }
  if (!joinedAt || d === 0) return "今天遇见";
  if (d === 1) return "认识 1 天";
  return `认识 ${d} 天`;
}
