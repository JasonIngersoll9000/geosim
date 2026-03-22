// Stub — implementation in next commit
export interface CallClaudeOptions {
  tools?: unknown[];
  maxTokens?: number;
}

export async function callClaude(
  _systemPrompt: string,
  _userPrompt: string,
  _options: CallClaudeOptions = {}
): Promise<unknown> {
  throw new Error("Not implemented");
}
