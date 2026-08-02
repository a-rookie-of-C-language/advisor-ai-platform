import type { OpenAIChatStreamEvent } from "../protocol/OpenAIChatStreamEvent.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";
import { OpenAIToolArgumentParser } from "./tools/arguments/OpenAIToolArgumentParser.js";

type OpenAIToolCallStreamEvent = Extract<OpenAIChatStreamEvent, { type: "tool_call" }>;

export class OpenAIToolCallEventFactory {
  create(toolCall: OpenAIToolCall): OpenAIToolCallStreamEvent {
    return {
      type: "tool_call",
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      toolArgs: OpenAIToolArgumentParser.parse(toolCall.function.arguments)
    };
  }
}
