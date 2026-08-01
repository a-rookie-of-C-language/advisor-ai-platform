import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import type { OpenAIChatStreamEvent } from "../protocol/OpenAIChatStreamEvent.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";
import { OpenAIToolCallEventFactory } from "./OpenAIToolCallEventFactory.js";

export type OpenAIToolExecutor = (toolName: string, args: JsonObject) => Promise<OpenAiToolExecutionResult>;

export class OpenAIToolRoundRunner {
  private readonly toolCallEventFactory = new OpenAIToolCallEventFactory();

  async *run(
    conversation: OpenAIChatMessage[],
    toolCalls: OpenAIToolCall[],
    toolExecutor: OpenAIToolExecutor
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    conversation.push({ role: "assistant", content: null, tool_calls: toolCalls });
    for (const toolCall of toolCalls) {
      const toolCallEvent = this.toolCallEventFactory.create(toolCall);
      yield toolCallEvent;
      const toolArgs = toolCallEvent.toolArgs;
      const toolResult = await toolExecutor(toolCall.function.name, toolArgs);
      yield {
        type: "tool_result",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        toolOutput: toolResult.output,
        success: toolResult.success
      };
      conversation.push({ role: "tool", tool_call_id: toolCall.id, content: toolResult.output });
    }
  }
}
