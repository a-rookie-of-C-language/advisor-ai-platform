import type { EngineContext } from "./EngineContext.js";
import type { EngineStrategy } from "./EngineStrategy.js";
import { EngineEvent } from "./EngineEvent.js";

export class ConversationQueryEngine {
  private readonly strategy: EngineStrategy;

  constructor(strategy: EngineStrategy) {
    this.strategy = strategy;
  }

  async *query(context: EngineContext): AsyncIterable<string> {
    for await (const event of this.queryEvents(context)) {
      yield event.toSse();
    }
  }

  async *queryEvents(context: EngineContext): AsyncIterable<EngineEvent> {
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
      yield event;
    }

    if (!sawDone) {
      const finishReason = sawError ? "stream_finished_with_error" : "stream_finished";
      yield EngineEvent.sysDone(finishReason, context.traceId ?? null);
    }
  }
}
