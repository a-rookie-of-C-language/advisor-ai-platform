import type { OpenAIToolCall } from "../../../tools/runtime/model/OpenAIToolCall.js";

export interface OpenAIChatRoundResult {
  textParts: string[];
  toolCalls: OpenAIToolCall[];
}
