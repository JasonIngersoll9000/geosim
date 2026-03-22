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
}

/**
 * Call Claude with prompt caching enabled on the system prompt.
 * The system prompt is sent as a single ephemeral-cached text block,
 * which caches the stable NEUTRALITY_PREAMBLE prefix across pipeline calls.
 * Returns the parsed JSON from the last text block in the response.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: CallClaudeOptions = {}
): Promise<unknown> {
  const { tools, maxTokens = 8192 } = options;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
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
    text.match(/(\{[\s\S]*\})/s) ||
    text.match(/(\[[\s\S]*\])/s);

  if (!jsonMatch) {
    throw new Error(`No JSON in response: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    throw new Error(`Failed to parse JSON: ${jsonMatch[1].slice(0, 300)}`);
  }
}
