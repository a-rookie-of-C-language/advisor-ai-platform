import type { EngineContext } from "./EngineContext.js";
import type { EngineEvent } from "./EngineEvent.js";
import { parseSseToEngineEvent } from "./parse_sse_to_engine_event.js";

export class LegacyEngineStrategy {
  constructor(private readonly streamFn: (messages: EngineContext["messages"], context: EngineContext) => AsyncIterable<string>) {}

  async *run(context: EngineContext): AsyncIterable<EngineEvent> {
    for await (const rawEvent of this.streamFn(context.messages, context)) {
      yield parseSseToEngineEvent(rawEvent);
    }
  }
}
