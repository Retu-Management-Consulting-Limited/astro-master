// Synastry invite tokens. Previously a single localStorage key, so creating a
// second invite silently erased the first partner (B1 / R2). Now a capped list:
// every invite is kept, the poll resolves whichever partner has filled in, and
// nothing is lost when you invite a second person.
export const TOKENS_KEY = "molly_syn_tokens";
const CAP = 6;

export function parseTokens(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Append a token (newest last), de-duplicated, capped to the most recent CAP.
export function withToken(list: string[], token: string): string[] {
  const next = [...list.filter((t) => t !== token), token];
  return next.slice(-CAP);
}

export function readTokens(): string[] {
  if (typeof window === "undefined") return [];
  return parseTokens(window.localStorage.getItem(TOKENS_KEY));
}

export function addStoredToken(token: string): string[] {
  const next = withToken(readTokens(), token);
  if (typeof window !== "undefined") window.localStorage.setItem(TOKENS_KEY, JSON.stringify(next));
  return next;
}
