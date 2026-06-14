import "server-only";
import { currentUser } from "./auth";

// Stable per-requester key for rate-limiting & cost attribution.
// Priority: logged-in user → tester cookie (mid) → client IP → anon.
function readCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.get("cookie") ?? "";
  for (const part of cookie.split(/; */)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

export async function resolveIdentity(req: Request): Promise<string> {
  const user = await currentUser(req).catch(() => null);
  if (user) return `u:${user.id}`;
  const mid = readCookie(req, "mid");
  if (mid) return `m:${mid}`;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return ip ? `ip:${ip}` : "anon";
}
