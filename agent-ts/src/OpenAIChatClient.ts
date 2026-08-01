import type { AgentConfig } from "./AgentConfig.js";
import type { ChatMessageDTO } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import { OpenAIChatCompletionStreamer } from "./OpenAIChatCompletionStreamer.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatStreamEvent } from "./OpenAIChatStreamEvent.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { OpenAIToolArgumentParser } from "./OpenAIToolArgumentParser.js";

type OpenAIToolExecutor = (toolName: string, args: JsonObject) => Promise<OpenAiToolExecutionResult>;

export class OpenAIChatClient {
  private readonly completionStreamer: OpenAIChatCompletionStreamer;

  constructor(private readonly config: AgentConfig) {
    this.completionStreamer = new OpenAIChatCompletionStreamer(config);
  }

  async *streamChat(messages: ChatMessageDTO[]): AsyncGenerator<string> {
    for await (const event of this.streamChatEvents(messages)) {
      if (event.type === "delta") {
        yield event.text;
      }
    }
  }

  async *streamChatEvents(
    messages: ChatMessageDTO[],
    tools: OpenAIChatTool[] = [],
    toolExecutor?: OpenAIToolExecutor
  ): AsyncGenerator<OpenAIChatStreamEvent> {
    if (!this.config.openAiApiKey) {
      return;
    }

    const conversation: OpenAIChatMessage[] = messages.map((message) => ({ role: message.role, content: message.content }));
    const firstRound = await this.completionStreamer.collectStream(conversation, tools);
    for (const text of firstRound.textParts) {
      yield { type: "delta", text };
    }

    if (firstRound.toolCalls.length === 0 || tools.length === 0 || !toolExecutor) {
      return;
    }

    conversation.push({ role: "assistant", content: null, tool_calls: firstRound.toolCalls });
    for (const toolCall of firstRound.toolCalls) {
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

    const finalRound = await this.completionStreamer.collectStream(conversation);
    for (const text of finalRound.textParts) {
      yield { type: "delta", text };
    }
  }
}
