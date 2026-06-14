// Allowlist sanitizer for Molly's light formatting (<b>/<i>/<br>/strong/em/u).
// Molly's messages include server-generated LLM replies, which can be
// prompt-injected — so before any of it reaches dangerouslySetInnerHTML we strip
// every tag outside the allowlist and ALL attributes (kills on*=, src=, href=,
// style=). Scoped to this controlled vocabulary, not a general HTML sanitizer.
const ALLOWED = new Set(["b", "i", "br", "strong", "em", "u"]);

export function sanitizeRichText(html: string): string {
  if (!html) return "";
  // 1) remove dangerous element blocks together with their content
  let s = html.replace(/<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "");
  // 2) for every remaining tag: keep allowlisted tags as BARE tags (no attributes),
  //    drop everything else (img, a, div, on*-bearing, etc.) entirely.
  s = s.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)[^>]*?>/g, (_m, slash: string, tag: string) => {
    const t = tag.toLowerCase();
    return ALLOWED.has(t) ? `<${slash ? "/" : ""}${t}>` : "";
  });
  return s;
}
