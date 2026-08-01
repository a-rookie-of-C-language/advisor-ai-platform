import type { OpenAIToolCall } from "./OpenAIToolCall.js";

export interface OpenAIChatRoundResult {
  textParts: string[];
  toolCalls: OpenAIToolCall[];
}
