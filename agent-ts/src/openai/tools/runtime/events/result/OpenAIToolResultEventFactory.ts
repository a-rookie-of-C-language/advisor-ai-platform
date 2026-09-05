import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";
import type { OpenAIChatStreamEvent } from "../../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import type { OpenAiToolExecutionResult } from "../../model/result/OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "../../model/call/OpenAIToolCall.js";

type OpenAIToolResultStreamEvent = Extract<OpenAIChatStreamEvent, { type: "tool_result" }>;

export class OpenAIToolResultEventFactory {
  create(toolCall: OpenAIToolCall, toolResult: OpenAiToolExecutionResult): OpenAIToolResultStreamEvent {
    return {
      type: "tool_result",
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      toolArgs: JSON.parse(toolCall.function.arguments || "{}") as JsonObject,
      toolOutput: toolResult.output,
      attempt: toolResult.attempt ?? 0,
      success: toolResult.success
    };
  }
}
