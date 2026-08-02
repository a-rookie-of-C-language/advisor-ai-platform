import type { OpenAIChatStreamEvent } from "../../protocol/events/OpenAIChatStreamEvent.js";

export class OpenAIChatDeltaEventFactory {
  create(textParts: string[]): OpenAIChatStreamEvent[] {
    return textParts.map((text) => ({ type: "delta", text }));
  }
}
