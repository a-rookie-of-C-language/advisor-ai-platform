import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";
import type { OpenAIChatStreamEvent } from "../../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import type { OpenAIChatMessage } from "../../../../chat/model/message/OpenAIChatMessage.js";
import { OpenAIToolCallEventFactory } from "../../events/call/OpenAIToolCallEventFactory.js";
import type { OpenAiToolExecutionResult } from "../../model/result/OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "../../model/call/OpenAIToolCall.js";
import { OpenAIToolConversationAppender } from "../../state/conversation/OpenAIToolConversationAppender.js";
import { OpenAIToolResultEventFactory } from "../../events/result/OpenAIToolResultEventFactory.js";

export type OpenAIToolExecutor = (
  toolName: string,
  args: JsonObject,
  signal?: AbortSignal
) => Promise<OpenAiToolExecutionResult>;

export class OpenAIToolRoundRunner {
  private readonly conversationAppender = new OpenAIToolConversationAppender();
  private readonly toolCallEventFactory = new OpenAIToolCallEventFactory();
  private readonly toolResultEventFactory = new OpenAIToolResultEventFactory();

  async *run(
    conversation: OpenAIChatMessage[],
    toolCalls: OpenAIToolCall[],
    toolExecutor: OpenAIToolExecutor,
    signal?: AbortSignal
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    this.conversationAppender.appendAssistantToolCalls(conversation, toolCalls);
    for (const toolCall of toolCalls) {
      throwIfAborted(signal);
      const toolCallEvent = this.toolCallEventFactory.create(toolCall);
      yield toolCallEvent;
      const toolArgs = toolCallEvent.toolArgs;
      const toolResult = await toolExecutor(toolCall.function.name, toolArgs, signal);
      throwIfAborted(signal);
      yield this.toolResultEventFactory.create(toolCall, toolResult);
      this.conversationAppender.appendToolResult(conversation, toolCall, toolResult.output);
    }
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Agent stream aborted");
  }
}
