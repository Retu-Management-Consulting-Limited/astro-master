export interface GuardResult {
  ok: boolean;
  reason?: string;
}

// A money amount: digits (incl. 万/千/k) optionally with currency.
const AMOUNT = /(\d[\d,.]*\s*(万|千|百万|元|块|w|k|\$|￥|美元|刀))|([￥$]\s*\d)/i;
// A future time reference.
const FUTURE = /(明年|下个?月|今年|年底|年内|个?月内|周内|天内|下半年|未来)/;
const SHAME = /(越来越穷|会更穷|你就完了|你这样下去|活该|没救|丢人现眼|一事无成)/;
const GAMBLE = /(梭哈|敢赌|赌一把|杠杆|满仓|押注一把|all\s*in|搏一搏|冲一波|抄底一把|彩票|博一把)/i;

// Single output gate for ALL money copy (route + render). 不报数字 / 不捅羞耻 / 不怂恿赌性.
export function validateMoneyCopy(text: string): GuardResult {
  if (AMOUNT.test(text) && FUTURE.test(text)) return { ok: false, reason: "amount×date 可证伪硬预测" };
  if (AMOUNT.test(text) && /(赚|进账|收入|到手|赢)/.test(text)) return { ok: false, reason: "金额收益硬预测" };
  if (SHAME.test(text)) return { ok: false, reason: "羞耻句式" };
  if (GAMBLE.test(text)) return { ok: false, reason: "赌性/投机怂恿" };
  return { ok: true };
}
