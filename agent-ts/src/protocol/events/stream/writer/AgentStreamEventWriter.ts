import type { OpenAIChatStreamEvent } from "../../model/openai/OpenAIChatStreamEvent.js";
import { AgentStreamEventEmitter } from "../emitter/AgentStreamEventEmitter.js";
import type { SseWriter } from "../../../sse/writer/SseWriter.js";
import { StreamingRegexSafetyFilter } from "../../../../safety/streaming/StreamingRegexSafetyFilter.js";

export class AgentStreamEventWriter {
  private answerText = "";
  private emittedDelta = false;
  private readonly eventEmitter: AgentStreamEventEmitter;
  private readonly safetyFilter = new StreamingRegexSafetyFilter();

  constructor(writer: SseWriter, useDeltaEvent: boolean = false) {
    this.eventEmitter = new AgentStreamEventEmitter(writer, useDeltaEvent);
  }

  get answer(): string {
    return this.answerText;
  }

  get emitted(): boolean {
    return this.emittedDelta;
  }

  async write(event: OpenAIChatStreamEvent): Promise<void> {
    if (event.type === "delta") {
      const safeText = this.safetyFilter.processChunk(event.text);
      if (safeText) {
        this.emittedDelta = true;
        this.answerText += safeText;
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
    this.answerText += safeText;
    await this.eventEmitter.writeDelta(safeText);
  }

  async writeMissingOpenAiApiKeyFallback(): Promise<void> {
    const answer = "TS agent 已启动，但当前未配置 OPENAI_API_KEY，无法调用模型。";
    this.emittedDelta = true;
    this.answerText = answer;
    await this.eventEmitter.writeDelta(answer);
  }
}
