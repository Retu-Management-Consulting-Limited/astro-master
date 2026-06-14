import { sanitizeRichText } from "@/lib/sanitize";

// Renders a chat message body. User-authored text is rendered as inert text so
// it can never inject live DOM (P0-1 XSS). Molly's own messages (seed lines and
// server LLM replies) keep their intended light formatting (<b>/<i>/<br>), but
// are run through an allowlist sanitizer first — LLM output can be prompt-injected,
// so it must not reach dangerouslySetInnerHTML raw (X-1, audit-2 P0).
export function ChatMessageBody({ from, text }: { from: "me" | "molly"; text: string }) {
  if (from === "me") return <>{text}</>;
  return <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(text) }} />;
}
