import type { OpenAIChatStreamEvent } from "../../../protocol/events/OpenAIChatStreamEvent.js";
import type { OpenAIChatRoundResult } from "../model/OpenAIChatRoundResult.js";
import { OpenAIChatDeltaEventFactory } from "./OpenAIChatDeltaEventFactory.js";

export class OpenAIChatRoundEventFactory {
  private readonly deltaEventFactory = new OpenAIChatDeltaEventFactory();

  create(round: OpenAIChatRoundResult): OpenAIChatStreamEvent[] {
    return this.deltaEventFactory.create(round.textParts);
  }
}
