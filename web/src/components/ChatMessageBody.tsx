// Renders a chat message body. User-authored text is rendered as inert text so
// it can never inject live DOM (P0-1 XSS). Molly's own messages (seed lines and
// server-generated replies) keep their intended light formatting (<b>/<i>/<br>).
export function ChatMessageBody({ from, text }: { from: "me" | "molly"; text: string }) {
  if (from === "me") return <>{text}</>;
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}
