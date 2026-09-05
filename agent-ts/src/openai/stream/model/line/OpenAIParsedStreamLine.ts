import type { OpenAIStreamToolCallDelta } from "../toolCall/OpenAIStreamToolCallDelta.js";

export interface OpenAIParsedStreamLine {
  text: string;
  reasoning: string;
  toolCalls: OpenAIStreamToolCallDelta[];
}
