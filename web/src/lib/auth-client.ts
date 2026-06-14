// Client-side wrappers around /api/auth/*. Thin, never throw to the caller's
// happy path — return a discriminated result the UI can branch on.
import type { FunnelSnapshot } from "./store";

export interface Me {
  email: string;
  profile: FunnelSnapshot | null;
}
export type AuthResult = { ok: true; data: Me } | { ok: false; status: number; error: string };

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function toResult(res: Response): Promise<AuthResult> {
  if (res.ok) return { ok: true, data: (await res.json()) as Me };
  let error = "出错了，再试一次";
  try {
    error = (await res.json())?.error ?? error;
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, error };
}

export async function apiRegister(email: string, password: string, profile?: FunnelSnapshot): Promise<AuthResult> {
  return toResult(await postJson("/api/auth/register", { email, password, profile }));
}
export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  return toResult(await postJson("/api/auth/login", { email, password }));
}
export async function apiLogout(): Promise<void> {
  await postJson("/api/auth/logout", {}).catch(() => {});
}
export async function apiDeleteAccount(): Promise<void> {
  await postJson("/api/auth/delete", {}).catch(() => {});
}
export async function apiSync(profile: FunnelSnapshot): Promise<void> {
  await postJson("/api/auth/sync", { profile }).catch(() => {});
}
export async function apiMe(): Promise<Me | null> {
  try {
    const res = await fetch("/api/auth/me", { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const j = (await res.json()) as { authenticated?: boolean } & Me;
    // /api/auth/me now returns 200 { authenticated:false } for guests (R12/P2-2).
    if (!j.authenticated) return null;
    return j as Me;
  } catch {
    return null;
  }
}
