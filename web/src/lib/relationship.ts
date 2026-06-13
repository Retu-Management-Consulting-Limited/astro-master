// Honest elapsed-time helpers — no fabricated "一年前的今天" for a day-1 user.
const DAY = 86400000;

export function daysSince(joinedAt?: number): number {
  if (!joinedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - joinedAt) / DAY));
}

export function metLabel(joinedAt?: number): string {
  const d = daysSince(joinedAt);
  if (!joinedAt || d === 0) return "今天遇见";
  if (d === 1) return "认识 1 天";
  return `认识 ${d} 天`;
}
