export type Variant = "personalized" | "barnum";

// Stable hash → arm. 80/20 toward personalized: barnum is only the control sample
// needed to measure the H3 delta, not a real product experience for most users.
export function assignVariant(userId: string): Variant {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 5 === 0 ? "barnum" : "personalized";
}
