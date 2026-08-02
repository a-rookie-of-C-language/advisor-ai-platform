import type { JsonObject } from "../../../common/json/JsonTypes.js";
import type { OpenAIChatStreamEvent } from "../../../protocol/events/OpenAIChatStreamEvent.js";
import type { OpenAIChatMessage } from "../../chat/model/OpenAIChatMessage.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";
import { OpenAIToolCallEventFactory } from "./OpenAIToolCallEventFactory.js";
import { OpenAIToolConversationAppender } from "./OpenAIToolConversationAppender.js";
import { OpenAIToolResultEventFactory } from "./OpenAIToolResultEventFactory.js";

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
