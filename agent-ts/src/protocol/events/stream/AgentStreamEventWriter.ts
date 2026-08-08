import type { OpenAIChatStreamEvent } from "../model/openai/OpenAIChatStreamEvent.js";
import { AgentStreamEventEmitter } from "./AgentStreamEventEmitter.js";
import type { SseWriter } from "../../sse/SseWriter.js";

export class AgentStreamEventWriter {
  private answerText = "";
  private emittedDelta = false;
  private readonly eventEmitter: AgentStreamEventEmitter;

  constructor(writer: SseWriter) {
    this.eventEmitter = new AgentStreamEventEmitter(writer);
  }

  get answer(): string {
    return this.answerText;
  }

  get emitted(): boolean {
    return this.emittedDelta;
  }

  async write(event: OpenAIChatStreamEvent): Promise<void> {
    if (event.type === "delta") {
      this.emittedDelta = true;
      this.answerText += event.text;
      await this.eventEmitter.writeDelta(event.text);
      return;
    }
    if (event.type === "tool_call") {
      await this.eventEmitter.writeToolCall(event.toolCallId, event.toolName, event.toolArgs);
      return;
    }
    await this.eventEmitter.writeToolResult(event.toolCallId, event.toolName, event.toolOutput, event.success);
  }

  async writeMissingOpenAiApiKeyFallback(): Promise<void> {
    const answer = "TS agent 已启动，但当前未配置 OPENAI_API_KEY，无法调用模型。";
    this.emittedDelta = true;
    this.answerText = answer;
    await this.eventEmitter.writeDelta(answer);
  }
}
