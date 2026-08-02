import type { OpenAIChatStreamEvent } from "../../../protocol/events/OpenAIChatStreamEvent.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";

type OpenAIToolResultStreamEvent = Extract<OpenAIChatStreamEvent, { type: "tool_result" }>;

export class OpenAIToolResultEventFactory {
  create(toolCall: OpenAIToolCall, toolResult: OpenAiToolExecutionResult): OpenAIToolResultStreamEvent {
    return {
      type: "tool_result",
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      toolOutput: toolResult.output,
      success: toolResult.success
    };
  }
}
