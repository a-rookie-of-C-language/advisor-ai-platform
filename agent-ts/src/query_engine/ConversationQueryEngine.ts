import type { EngineContext } from "./EngineContext.js";
import type { EngineStrategy } from "./EngineStrategy.js";
import { EngineEvent } from "./EngineEvent.js";

export class ConversationQueryEngine {
  private readonly strategy: EngineStrategy;
  private readonly progressTimeoutMs: number;

  constructor(strategy: EngineStrategy, progressTimeoutMs: number = 1000) {
    this.strategy = strategy;
    this.progressTimeoutMs = progressTimeoutMs;
  }

  async *query(context: EngineContext): AsyncIterable<string> {
    for await (const event of this.queryEvents(context)) {
      yield event.toSse();
    }
  }

  async *queryEvents(context: EngineContext): AsyncIterable<EngineEvent> {
    let sawDelta = false;
    let sawDone = false;
    let sawError = false;
    let progressSeconds = 0;
    const iterator = this.strategy.run(context)[Symbol.asyncIterator]();
    let pendingNext: Promise<IteratorResult<EngineEvent>> | null = null;

    while (true) {
      if (!pendingNext) {
        pendingNext = iterator.next();
      }
      const result = await Promise.race([
        pendingNext,
        this.createProgressTimeout()
      ]);
      if (result === "timeout") {
        if (!sawDelta) {
          progressSeconds += 1;
          yield new EngineEvent(
            "sys_progress",
            "system",
            { message: "思考模式中考量中，请稍候...", elapsed_sec: progressSeconds },
            context.traceId ?? null
          );
        }
        continue;
      }
      pendingNext = null;
      if (result.done) {
        break;
      }
      let event = result.value;
      if (event.event === "sys_done") {
        sawDone = true;
      }
      if (event.event === "sys_error") {
        sawError = true;
      }
      if (event.event === "llm_data" || event.event === "llm_delta" || event.event === "raw" || event.event === "delta") {
        sawDelta = true;
      }
      if (!event.traceId) {
        event = new EngineEvent(event.event, event.source, event.payload, context.traceId ?? null, event.eventVersion);
      }
      yield event;
    }

    if (!sawDelta && !sawDone && !sawError) {
      yield new EngineEvent("error", "system", { message: "stream finished without content" }, context.traceId ?? null);
      return;
    }
    if (!sawDone) {
      const finishReason = sawError ? "stream_finished_with_error" : "stream_finished";
      yield EngineEvent.sysDone(finishReason, context.traceId ?? null);
    }
  }

  private async createProgressTimeout(): Promise<"timeout"> {
    await new Promise((resolve) => setTimeout(resolve, this.progressTimeoutMs));
    return "timeout";
  }
}
