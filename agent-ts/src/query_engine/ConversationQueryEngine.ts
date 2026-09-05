import type { EngineContext } from "./EngineContext.js";
import type { EngineStrategy } from "./EngineStrategy.js";
import { EngineEvent } from "./EngineEvent.js";

export class ConversationQueryEngine {
  constructor(private readonly strategy: EngineStrategy) {}

  async *query(context: EngineContext): AsyncIterable<string> {
    let sawDone = false;
    let sawError = false;

    for await (let event of this.strategy.run(context)) {
      if (event.event === "sys_done") {
        sawDone = true;
      }
      if (event.event === "sys_error") {
        sawError = true;
      }
      if (!event.traceId) {
        event = new EngineEvent(event.event, event.source, event.payload, context.traceId ?? null, event.eventVersion);
      }
      yield event.toSse();
    }

    if (!sawDone) {
      const finishReason = sawError ? "stream_finished_with_error" : "stream_finished";
      yield EngineEvent.sysDone(finishReason, context.traceId ?? null).toSse();
    }
  }
}
