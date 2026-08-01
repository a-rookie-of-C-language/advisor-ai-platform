import type { OpenAIChatStreamEvent } from "./OpenAIChatStreamEvent.js";
import type { SseWriter } from "./SseWriter.js";

export class AgentStreamEventWriter {
  private answerText = "";
  private emittedDelta = false;

  constructor(private readonly writer: SseWriter) {}

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
      await this.writer.write("llm_delta", "llm", { text: event.text });
      return;
    }
    if (event.type === "tool_call") {
      await this.writer.write("tool_call", "tool", {
        tool_call_id: event.toolCallId,
        tool_name: event.toolName,
        tool_args: event.toolArgs
      });
      return;
    }
    await this.writer.write("tool_result", "tool", {
      tool_call_id: event.toolCallId,
      tool_name: event.toolName,
      tool_output: event.toolOutput,
      success: event.success
    });
  }

  async writeMissingOpenAiApiKeyFallback(): Promise<void> {
    const answer = "TS agent 已启动，但当前未配置 OPENAI_API_KEY，无法调用模型。";
    this.emittedDelta = true;
    this.answerText = answer;
    await this.writer.write("llm_delta", "llm", { text: answer });
  }
}
