import "server-only";
import { scryptSync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getKV } from "./store";

// Account system on top of the existing KV (Upstash in cloud, in-memory locally
// /tests). Passwords are scrypt-hashed (node built-in, serverless-safe). Sessions
// are server-side tokens so they can be revoked; expiry is checked lazily on read
// since the KV abstraction has no native TTL.

export interface Profile {
  birth?: unknown;
  birthForm?: unknown;
  chart?: unknown;
  firstRead?: unknown;
  nickname?: string;
  joinedAt?: number;
}
export interface User {
  id: string;
  email: string;
  pwHash: string;
  createdAt: number;
  profile?: Profile;
}
interface Session {
  userId: string;
  exp: number;
}

export const SESSION_COOKIE = "msid";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// Cookie options for the session cookie. `secure` only in production so http
// localhost keeps working. Pass maxAge=0 to clear.
export function sessionCookieOpts(maxAge: number = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

// Basic input validation (no email-verification mail in MVP).
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
export function validatePassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && /[a-zA-Z]/.test(pw);
}

export class EmailTakenError extends Error {}

// ---- password hashing ----
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(pw, salt, 64);
  return `${salt.toString("hex")}:${dk.toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [s, h] = stored.split(":");
  if (!s || !h) return false;
  const dk = scryptSync(pw, Buffer.from(s, "hex"), 64);
  const hb = Buffer.from(h, "hex");
  return dk.length === hb.length && timingSafeEqual(dk, hb);
}

// ---- key helpers ----
const emailKey = (e: string) => `uemail:${e.trim().toLowerCase()}`;
const userKey = (id: string) => `user:${id}`;
const sessKey = (t: string) => `sess:${t}`;

// ---- users ----
export async function findUserIdByEmail(email: string): Promise<string | null> {
  return (await (await getKV()).get(emailKey(email))) as string | null;
}
export async function getUser(id: string): Promise<User | null> {
  return (await (await getKV()).get(userKey(id))) as User | null;
}

export async function createUser(email: string, password: string, profile?: Profile): Promise<User> {
  const kv = await getKV();
  const norm = email.trim().toLowerCase();
  if (await kv.get(emailKey(norm))) throw new EmailTakenError("email taken");
  const user: User = { id: randomUUID(), email: norm, pwHash: hashPassword(password), createdAt: Date.now(), profile };
  await kv.set(userKey(user.id), user);
  await kv.set(emailKey(norm), user.id);
  return user;
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const id = await findUserIdByEmail(email);
  if (!id) return null;
  const user = await getUser(id);
  if (!user) return null;
  return verifyPassword(password, user.pwHash) ? user : null;
}

export async function saveProfile(userId: string, profile: Profile): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;
  await (await getKV()).set(userKey(userId), { ...user, profile });
}

export async function deleteUser(userId: string): Promise<void> {
  const kv = await getKV();
  const user = await getUser(userId);
  if (user) await kv.del(emailKey(user.email));
  await kv.del(userKey(userId));
}

// ---- sessions ----
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const sess: Session = { userId, exp: Date.now() + SESSION_TTL_MS };
  await (await getKV()).set(sessKey(token), sess);
  return token;
}
export async function getSessionUserId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const kv = await getKV();
  const sess = (await kv.get(sessKey(token))) as Session | null;
  if (!sess) return null;
  if (sess.exp < Date.now()) {
    await kv.del(sessKey(token)).catch(() => {});
    return null;
  }
  return sess.userId;
}
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await (await getKV()).del(sessKey(token));
}

// ---- request helper ----
export function readSessionToken(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") ?? "";
  for (const part of cookie.split(/; */)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === SESSION_COOKIE) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

// Returns the authenticated user for a request, or null.
export async function currentUser(req: Request): Promise<User | null> {
  const uid = await getSessionUserId(readSessionToken(req));
  return uid ? getUser(uid) : null;
}
