import type { OpenAIChatStreamEvent } from "../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import type { OpenAIChatRoundResult } from "../../model/round/OpenAIChatRoundResult.js";
import { OpenAIChatDeltaEventFactory } from "../delta/OpenAIChatDeltaEventFactory.js";

export class OpenAIChatRoundEventFactory {
  private readonly deltaEventFactory = new OpenAIChatDeltaEventFactory();

  create(round: OpenAIChatRoundResult): OpenAIChatStreamEvent[] {
    return this.deltaEventFactory.create(round.textParts);
  }
}
