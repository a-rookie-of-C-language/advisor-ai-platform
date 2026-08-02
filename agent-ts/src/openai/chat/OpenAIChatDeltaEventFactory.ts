import type { OpenAIChatStreamEvent } from "../../protocol/OpenAIChatStreamEvent.js";

export class OpenAIChatDeltaEventFactory {
  create(textParts: string[]): OpenAIChatStreamEvent[] {
    return textParts.map((text) => ({ type: "delta", text }));
  }
}
