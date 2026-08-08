import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { OpenAIChatStreamEvent } from "../../../../protocol/events/model/openai/OpenAIChatStreamEvent.js";
import type { OpenAIChatMessage } from "../../../chat/model/message/OpenAIChatMessage.js";
import { OpenAIToolCallEventFactory } from "../events/call/OpenAIToolCallEventFactory.js";
import type { OpenAiToolExecutionResult } from "../model/OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "../model/OpenAIToolCall.js";
import { OpenAIToolConversationAppender } from "../state/conversation/OpenAIToolConversationAppender.js";
import { OpenAIToolResultEventFactory } from "../events/result/OpenAIToolResultEventFactory.js";

export type OpenAIToolExecutor = (toolName: string, args: JsonObject) => Promise<OpenAiToolExecutionResult>;

export class OpenAIToolRoundRunner {
  private readonly conversationAppender = new OpenAIToolConversationAppender();
  private readonly toolCallEventFactory = new OpenAIToolCallEventFactory();
  private readonly toolResultEventFactory = new OpenAIToolResultEventFactory();

  async *run(
    conversation: OpenAIChatMessage[],
    toolCalls: OpenAIToolCall[],
    toolExecutor: OpenAIToolExecutor
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    this.conversationAppender.appendAssistantToolCalls(conversation, toolCalls);
    for (const toolCall of toolCalls) {
      const toolCallEvent = this.toolCallEventFactory.create(toolCall);
      yield toolCallEvent;
      const toolArgs = toolCallEvent.toolArgs;
      const toolResult = await toolExecutor(toolCall.function.name, toolArgs);
      yield this.toolResultEventFactory.create(toolCall, toolResult);
      this.conversationAppender.appendToolResult(conversation, toolCall, toolResult.output);
    }
  }
}
