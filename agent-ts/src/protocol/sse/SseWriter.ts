import type { ServerResponse } from "node:http";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { AgentCoreClient } from "../../core/client/AgentCoreClient.js";

export class SseWriter {
  constructor(
    private readonly response: ServerResponse,
    private readonly core: AgentCoreClient,
    private readonly traceId: string
  ) {}

  async start(): Promise<void> {
    this.response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    await this.write("sys_start", "system", { message: "stream_started", runtime: "typescript" });
  }

  async write(event: string, source: string, payload: JsonObject): Promise<void> {
    this.response.write(
      await this.core.serializeEvent({
        event,
        source,
        traceId: this.traceId,
        payload
      })
    );
  }

  async done(finishReason: string): Promise<void> {
    await this.write("sys_done", "system", { finish_reason: finishReason });
    this.response.end();
  }

  async error(code: string, message: string, retryable: boolean): Promise<void> {
    await this.write("sys_error", "system", { code, message, retryable });
    await this.done("stream_finished_with_error");
  }
}
