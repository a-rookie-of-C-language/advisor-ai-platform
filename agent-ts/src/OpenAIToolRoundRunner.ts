import type { JsonObject } from "./common/JsonTypes.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import type { OpenAIChatStreamEvent } from "./protocol/OpenAIChatStreamEvent.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";
import { OpenAIToolArgumentParser } from "./OpenAIToolArgumentParser.js";

export type OpenAIToolExecutor = (toolName: string, args: JsonObject) => Promise<OpenAiToolExecutionResult>;

export class OpenAIToolRoundRunner {
  async *run(
    conversation: OpenAIChatMessage[],
    toolCalls: OpenAIToolCall[],
    toolExecutor: OpenAIToolExecutor
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    conversation.push({ role: "assistant", content: null, tool_calls: toolCalls });
    for (const toolCall of toolCalls) {
      const toolArgs = OpenAIToolArgumentParser.parse(toolCall.function.arguments);
      yield {
        type: "tool_call",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        toolArgs
      };
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
