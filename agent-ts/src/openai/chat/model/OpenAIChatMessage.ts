import type { OpenAIToolCall } from "../../tools/runtime/model/OpenAIToolCall.js";

export interface OpenAIChatMessage {
  role: string;
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}
