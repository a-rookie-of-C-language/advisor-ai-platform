import type { OpenAIChatMessage } from "../../../chat/model/message/OpenAIChatMessage.js";
import type { OpenAIToolCall } from "../model/OpenAIToolCall.js";

export class OpenAIToolConversationAppender {
  appendAssistantToolCalls(conversation: OpenAIChatMessage[], toolCalls: OpenAIToolCall[]): void {
    conversation.push({ role: "assistant", content: null, tool_calls: toolCalls });
  }

  appendToolResult(conversation: OpenAIChatMessage[], toolCall: OpenAIToolCall, output: string): void {
    conversation.push({ role: "tool", tool_call_id: toolCall.id, content: output });
  }
}
