import type { OpenAIChatStreamEvent } from "../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";

export class OpenAIChatDeltaEventFactory {
  create(textParts: string[]): OpenAIChatStreamEvent[] {
    return textParts.map((text) => ({ type: "delta", text }));
  }

  createReasoning(reasoningParts: string[]): OpenAIChatStreamEvent[] {
    return reasoningParts.map((text) => ({ type: "reasoning_delta", text }));
  }
}
