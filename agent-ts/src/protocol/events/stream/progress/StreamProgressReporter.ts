import type { SseWriter } from "../../../sse/writer/SseWriter.js";

export class StreamProgressReporter {
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private elapsedSeconds = 0;
  private stopped = false;

  constructor(
    private readonly intervalMs: number = 1000,
    private readonly message: string = "思考模式中考量中，请稍候..."
  ) {}

  start(writer: Pick<SseWriter, "write">, shouldContinue: () => boolean, traceId: string | null): void {
    this.stop();
    this.stopped = false;
    this.elapsedSeconds = 0;
    this.scheduleNextTick(writer, shouldContinue, traceId);
  }

  stop(): void {
    this.stopped = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private scheduleNextTick(writer: Pick<SseWriter, "write">, shouldContinue: () => boolean, traceId: string | null): void {
    this.timeoutId = setTimeout(() => {
      void this.emitTick(writer, shouldContinue, traceId);
    }, this.intervalMs);
  }

  private async emitTick(
    writer: Pick<SseWriter, "write">,
    shouldContinue: () => boolean,
    traceId: string | null
  ): Promise<void> {
    if (this.stopped || !shouldContinue()) {
      return;
    }
    this.elapsedSeconds += 1;
    try {
      await writer.write("sys_progress", "system", {
        message: this.message,
        elapsed_sec: this.elapsedSeconds,
        trace_id: traceId ?? ""
      });
    } catch {
      this.stop();
      return;
    }
    if (this.stopped || !shouldContinue()) {
      return;
    }
    this.scheduleNextTick(writer, shouldContinue, traceId);
  }
}
