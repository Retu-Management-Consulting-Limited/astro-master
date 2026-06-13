import { tmpdir } from "node:os";
import { query } from "@anthropic-ai/claude-agent-sdk";

// Single dual-path LLM runner shared by /api/reading and /api/chat.
//   • ANTHROPIC_API_KEY set → direct Anthropic API (fast ~2-5s, production)
//   • no key                → Agent SDK reusing the local Claude Code
//                             SUBSCRIPTION login (pilot, ~40-90s cold start)
// Same prompt + system in both; caller passes the system persona.

const MODEL_ALIAS = (process.env.MOLLY_MODEL || "sonnet").toLowerCase();
const MODEL_ID: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
};
const USE_API = !!process.env.ANTHROPIC_API_KEY;
export const AI_BACKEND = USE_API ? "api" : "subscription";

async function viaApi(prompt: string, system: string, ac: AbortController, maxTokens: number): Promise<string> {
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
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

async function viaSdk(prompt: string, system: string, ac: AbortController): Promise<string> {
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

export function runLLM(prompt: string, system: string, ac: AbortController, maxTokens = 1024): Promise<string> {
  return USE_API ? viaApi(prompt, system, ac, maxTokens) : viaSdk(prompt, system, ac);
}
