import type { OpenAIStreamToolCallDelta } from "./OpenAIStreamToolCallDelta.js";

export interface OpenAIParsedStreamLine {
  text: string;
  toolCalls: OpenAIStreamToolCallDelta[];
}
