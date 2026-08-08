import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { SseWriter } from "../../../sse/writer/SseWriter.js";

export class AgentStreamEventEmitter {
  constructor(private readonly writer: SseWriter) {}

  async writeDelta(text: string): Promise<void> {
    await this.writer.write("llm_delta", "llm", { text });
  }

  async writeToolCall(toolCallId: string, toolName: string, toolArgs: JsonObject): Promise<void> {
    await this.writer.write("tool_call", "tool", {
      tool_call_id: toolCallId,
      tool_name: toolName,
      tool_args: toolArgs
    });
  }

  async writeToolResult(toolCallId: string, toolName: string, toolOutput: string, success: boolean): Promise<void> {
    await this.writer.write("tool_result", "tool", {
      tool_call_id: toolCallId,
      tool_name: toolName,
      tool_output: toolOutput,
      success
    });
  }
}
