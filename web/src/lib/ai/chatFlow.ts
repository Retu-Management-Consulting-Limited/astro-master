import { detectCrisis, crisisResponseFor } from "./safety";

// Pure routing for a user's chat message. The crisis branch is deterministic and
// independent of the AI toggle — the safety net must fire whether AI is on, off,
// or down (P0-2). Only after crisis is ruled out do we choose AI vs the scripted
// demo reply. Mirrors the server-side order in /api/chat (crisis BEFORE the model).
export type ChatRoute =
  | { kind: "crisis"; text: string }
  | { kind: "ai" }
  | { kind: "scripted" };

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();

export function routeUserMessage(
  text: string,
  opts: { aiOn: boolean; hasChart: boolean; locale?: string },
): ChatRoute {
  if (detectCrisis(stripHtml(text), opts.locale))
    return { kind: "crisis", text: crisisResponseFor(opts.locale) };
  if (opts.aiOn && opts.hasChart) return { kind: "ai" };
  return { kind: "scripted" };
}
