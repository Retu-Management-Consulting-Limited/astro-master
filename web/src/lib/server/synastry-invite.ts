import "server-only";
import { randomBytes } from "node:crypto";
import { getKV } from "./store";

// Synastry invite: person A creates a token, shares the link; person B opens it
// and submits their real birth data; A reads the partner chart back by token.
// The token IS the capability (unguessable) — anyone with it can submit/read the
// partner slot, which is acceptable for a shared compatibility reading.

export interface Partner {
  name?: string;
  chart: unknown; // computed client-side from B's real birth data
  birthForm?: unknown;
}
export interface Invite {
  inviterName?: string;
  createdAt: number;
  partner: Partner | null;
}

const key = (token: string) => `synv:${token}`;

export async function createInvite(inviterName?: string): Promise<string> {
  const token = randomBytes(12).toString("hex");
  const invite: Invite = { inviterName: inviterName?.slice(0, 40), createdAt: Date.now(), partner: null };
  await (await getKV()).set(key(token), invite);
  return token;
}

export async function getInvite(token: string): Promise<Invite | null> {
  if (!token) return null;
  return (await (await getKV()).get(key(token))) as Invite | null;
}

// Returns false if the token is unknown (expired/invalid link).
export async function setPartner(token: string, partner: Partner): Promise<boolean> {
  const kv = await getKV();
  const invite = (await kv.get(key(token))) as Invite | null;
  if (!invite) return false;
  invite.partner = { name: partner.name?.slice(0, 40), chart: partner.chart, birthForm: partner.birthForm };
  await kv.set(key(token), invite);
  return true;
}
