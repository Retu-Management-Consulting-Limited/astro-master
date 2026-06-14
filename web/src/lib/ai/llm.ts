// Single dual-path LLM runner shared by /api/reading and /api/chat.
//   • ANTHROPIC_API_KEY set → direct Anthropic API (fast ~2-5s, production)
//   • no key                → Agent SDK reusing the local Claude Code
//                             SUBSCRIPTION login (pilot, ~40-90s cold start)
// Same prompt + system in both; caller passes the system persona.
//
// The Agent SDK bundles a native engine binary, so it's imported LAZILY (only
// when actually using the subscription path). On a cloud deploy with an API key
// the SDK is never imported → the serverless bundle stays lean.

const MODEL_ALIAS = (process.env.MOLLY_MODEL || "sonnet").toLowerCase();
const MODEL_ID: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
};
const USE_API = !!process.env.ANTHROPIC_API_KEY;
export const AI_BACKEND = USE_API ? "api" : "subscription";

export interface Usage {
  model: string; // alias: haiku | sonnet | opus
  inTok: number;
  outTok: number;
}
export interface LLMResult {
  text: string;
  usage?: Usage; // present on the API path; the subscription path doesn't bill
}

async function viaApi(prompt: string, system: string, ac: AbortController, maxTokens: number): Promise<LLMResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const msg = await client.messages.create(
    {
      model: MODEL_ID[MODEL_ALIAS] ?? MODEL_ID.sonnet,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    },
    { signal: ac.signal },
  );
  return {
    text: msg.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
    usage: { model: MODEL_ALIAS, inTok: msg.usage?.input_tokens ?? 0, outTok: msg.usage?.output_tokens ?? 0 },
  };
}

async function viaSdk(prompt: string, system: string, ac: AbortController): Promise<string> {
  const { tmpdir } = await import("node:os");
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  let out = "";
  for await (const m of query({
    prompt,
    options: {
      allowedTools: [],
      maxTurns: 1,
      permissionMode: "bypassPermissions",
      model: MODEL_ALIAS,
      systemPrompt: system,
      // Pure completion: skip this workspace's CLAUDE.md / settings / MCP.
      settingSources: [],
      mcpServers: {},
      cwd: tmpdir(),
      abortController: ac, // client disconnect kills the subprocess
    },
  })) {
    if (m.type === "result") out = (m as { result?: string }).result ?? "";
  }
  return out;
}

export async function runLLM(prompt: string, system: string, ac: AbortController, maxTokens = 1024): Promise<LLMResult> {
  if (USE_API) return viaApi(prompt, system, ac, maxTokens);
  return { text: await viaSdk(prompt, system, ac) };
}
