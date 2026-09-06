import type { OpenAIChatStreamEvent } from "../../model/openai/OpenAIChatStreamEvent.js";
import { AgentStreamEventEmitter } from "../emitter/AgentStreamEventEmitter.js";
import type { SseWriter } from "../../../sse/writer/SseWriter.js";
import { StreamingRegexSafetyFilter } from "../../../../safety/streaming/StreamingRegexSafetyFilter.js";

export class AgentStreamEventWriter {
  private answerText = "";
  private emittedDelta = false;
  private debugPreviewText = "";
  private debugPreviewChars = 0;
  private emittedDeltaCount = 0;
  private readonly eventEmitter: AgentStreamEventEmitter;
  private readonly safetyFilter = new StreamingRegexSafetyFilter();

  constructor(
    writer: SseWriter,
    useDeltaEvent: boolean = false,
    private readonly debugEnabled: boolean = false
  ) {
    this.eventEmitter = new AgentStreamEventEmitter(writer, useDeltaEvent);
  }

  get answer(): string {
    return this.answerText.trim();
  }

  get emitted(): boolean {
    return this.emittedDelta;
  }

  get debugPreview(): string {
    return this.debugPreviewText;
  }

  get deltaCount(): number {
    return this.emittedDeltaCount;
  }

  async write(event: OpenAIChatStreamEvent): Promise<void> {
    if (event.type === "delta") {
      const safeText = this.safetyFilter.processChunk(event.text);
      if (safeText) {
        this.emittedDelta = true;
        if (this.debugEnabled) {
          this.emittedDeltaCount += 1;
        }
        this.answerText += safeText;
        this.appendDebugPreview(safeText);
        await this.eventEmitter.writeDelta(safeText);
      }
      return;
    }
    if (event.type === "reasoning_delta") {
      await this.eventEmitter.writeReasoningDelta(event.text);
      return;
    }
    if (event.type === "tool_call") {
      await this.eventEmitter.writeToolCall(event.toolCallId, event.toolName, event.toolArgs);
      return;
    }
    await this.eventEmitter.writeToolResult(
      event.toolCallId,
      event.toolName,
      event.toolArgs,
      event.toolOutput,
      event.attempt,
      event.success
    );
  }

  async flushSafetyFilter(): Promise<void> {
    const safeText = this.safetyFilter.flush();
    if (!safeText) return;
    this.emittedDelta = true;
    if (this.debugEnabled) {
      this.emittedDeltaCount += 1;
    }
    this.answerText += safeText;
    this.appendDebugPreview(safeText);
    await this.eventEmitter.writeDelta(safeText);
  }

  async writeMissingOpenAiApiKeyFallback(): Promise<void> {
    const answer = "TS agent 已启动，但当前未配置 OPENAI_API_KEY，无法调用模型。";
    this.emittedDelta = true;
    if (this.debugEnabled) {
      this.emittedDeltaCount += 1;
    }
    this.answerText = answer;
    this.appendDebugPreview(answer);
    await this.eventEmitter.writeDelta(answer);
  }

  private appendDebugPreview(delta: string): void {
    if (!this.debugEnabled) {
      return;
    }
    const previewLimit = 200;
    if (this.debugPreviewChars >= previewLimit) {
      return;
    }
    const remaining = previewLimit - this.debugPreviewChars;
    const piece = delta.slice(0, remaining);
    if (!piece) {
      return;
    }
    this.debugPreviewText += piece;
    this.debugPreviewChars += piece.length;
  }
}
