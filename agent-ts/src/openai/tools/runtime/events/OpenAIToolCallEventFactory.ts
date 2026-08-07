import type { OpenAIChatStreamEvent } from "../../../../protocol/events/model/OpenAIChatStreamEvent.js";
import { OpenAIToolArgumentParser } from "../../arguments/parser/OpenAIToolArgumentParser.js";
import type { OpenAIToolCall } from "../model/OpenAIToolCall.js";

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
