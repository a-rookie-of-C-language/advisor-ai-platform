import type { OpenAIChatRoundResult } from "./OpenAIChatRoundResult.js";
import { OpenAIChatDeltaEventFactory } from "./OpenAIChatDeltaEventFactory.js";
import type { OpenAIChatStreamEvent } from "../protocol/OpenAIChatStreamEvent.js";

export class OpenAIChatRoundEventFactory {
  private readonly deltaEventFactory = new OpenAIChatDeltaEventFactory();

  create(round: OpenAIChatRoundResult): OpenAIChatStreamEvent[] {
    return this.deltaEventFactory.create(round.textParts);
  }
}
