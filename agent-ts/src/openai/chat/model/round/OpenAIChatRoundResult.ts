import type { OpenAIToolCall } from "../../../tools/runtime/model/call/OpenAIToolCall.js";

export interface OpenAIChatRoundResult {
  textParts: string[];
  toolCalls: OpenAIToolCall[];
}
