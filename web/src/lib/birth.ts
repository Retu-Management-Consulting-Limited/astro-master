import { type BirthInput } from "./astro/chart";
import type { BirthForm } from "./store";

// Shared birth-resolution used by both /input and /me/birth (edit). The key
// invariant: a place/date/time change ALWAYS re-resolves through /api/geocode so
// the chart is built on the historically-correct UTC offset, never a stale one.

export interface GeoResp {
  lat: number;
  lng: number;
  tz: number;
  label?: string;
}

// knownTime === true means "I don't know the exact time" → anchor at noon.
function effectiveTime(form: BirthForm): string {
  return form.knownTime ? "12:00" : form.time;
}

export function buildBirth(form: BirthForm, geo: GeoResp): BirthInput {
  const [y, mo, d] = form.date.split("-").map(Number);
  const [h, mi] = effectiveTime(form).split(":").map(Number);
  return { year: y, month: mo, day: d, hour: h, minute: mi, lat: geo.lat, lng: geo.lng, tz: geo.tz };
}

// Human-readable summary for the profile card, e.g. "1998-06-13 · 08:40 · 墨尔本".
export function birthSummary(form?: BirthForm): string {
  if (!form) return "未填写";
  const time = form.knownTime ? "时间未知" : form.time;
  return `${form.date} · ${time} · ${form.city}`;
}

export type ResolveResult = { birth: BirthInput; geo: GeoResp } | { error: string };

// Resolve a form to a BirthInput via /api/geocode. Never throws.
export async function resolveBirth(form: BirthForm): Promise<ResolveResult> {
  const qs = new URLSearchParams({
    city: form.city,
    country: form.country,
    date: form.date,
    time: effectiveTime(form),
  });
  let res: Response;
  try {
    res = await fetch(`/api/geocode?${qs.toString()}`);
  } catch {
    return { error: "网络出了点问题，再试一次" };
  }
  if (!res.ok) return { error: `没找到「${form.city}」` };
  const geo = (await res.json()) as GeoResp;
  return { birth: buildBirth(form, geo), geo };
}
