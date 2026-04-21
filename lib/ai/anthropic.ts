import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface CallClaudeOptions {
  tools?: unknown[];
  maxTokens?: number;
  /**
   * Pre-built system content blocks with cache_control markers already applied.
   * When provided, overrides the automatic single-block wrapping of `systemPrompt`.
   * Use `buildCachedSystemBlocks()` from lib/ai/prompts to construct the two-block
   * array that places separate ephemeral breakpoints on the NEUTRALITY_PREAMBLE
   * and on the agent-specific role instructions.
   */
  systemBlocks?: Anthropic.Messages.TextBlockParam[];
}

/**
 * Call Claude with prompt caching enabled on the system prompt.
 *
 * Two caching modes:
 *  - Default (no `systemBlocks`): the entire `systemPrompt` string is wrapped in a
 *    single cached text block (backward-compatible, single breakpoint).
 *  - Structured (`systemBlocks` provided): the caller supplies pre-built content
 *    blocks with `cache_control` markers. Use this to place two separate breakpoints —
 *    one on the shared NEUTRALITY_PREAMBLE and one on agent-specific role text —
 *    maximising cache reuse across the pipeline.
 *
 * Returns the parsed JSON from the last text block in the response.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: CallClaudeOptions = {}
): Promise<unknown> {
  const { tools, maxTokens = 8192, systemBlocks } = options;

  const systemParam: Anthropic.Messages.TextBlockParam[] = systemBlocks ?? [
    {
      type: "text" as const,
      text: systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemParam,
    messages: [{ role: "user", content: userPrompt }],
    ...(tools && tools.length > 0
      ? { tools: tools as Anthropic.Messages.Tool[] }
      : {}),
  });

  // Find the last text block — there may be preceding tool_use blocks
  // from web search that we skip over.
  const textBlocks = response.content.filter((b) => b.type === "text");
  const lastText = textBlocks[textBlocks.length - 1];
  if (!lastText || lastText.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const text = lastText.text;

  // Extract JSON — prefer code-fenced blocks, fall back to raw object/array
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)\s*```/) ||
    text.match(/```\s*([\s\S]*?)\s*```/) ||
    text.match(/(\{[\s\S]*\})/) ||
    text.match(/(\[[\s\S]*\])/);

  if (!jsonMatch) {
    throw new Error(`No JSON in response: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    throw new Error(`Failed to parse JSON: ${jsonMatch[1].slice(0, 300)}`);
  }
}
