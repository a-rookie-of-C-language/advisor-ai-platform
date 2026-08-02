import type { OpenAIToolCall } from "../../tools/runtime/OpenAIToolCall.js";

export interface OpenAIChatRoundResult {
  textParts: string[];
  toolCalls: OpenAIToolCall[];
}
