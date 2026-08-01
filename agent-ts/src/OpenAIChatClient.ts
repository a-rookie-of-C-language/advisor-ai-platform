import type { AgentConfig } from "./AgentConfig.js";
import type { ChatMessageDTO } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatStreamEvent } from "./OpenAIChatStreamEvent.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { OpenAIStreamParser } from "./OpenAIStreamParser.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";

type OpenAIToolExecutor = (toolName: string, args: JsonObject) => Promise<OpenAiToolExecutionResult>;

export class OpenAIChatClient {
  private readonly streamParser = new OpenAIStreamParser();

  constructor(private readonly config: AgentConfig) {}

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
    const firstRound = await this.collectStream(conversation, tools);
    for (const text of firstRound.textParts) {
      yield { type: "delta", text };
    }

    if (firstRound.toolCalls.length === 0 || tools.length === 0 || !toolExecutor) {
      return;
    }

    conversation.push({ role: "assistant", content: null, tool_calls: firstRound.toolCalls });
    for (const toolCall of firstRound.toolCalls) {
      const toolArgs = this.parseToolArguments(toolCall.function.arguments);
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

    const finalRound = await this.collectStream(conversation);
    for (const text of finalRound.textParts) {
      yield { type: "delta", text };
    }
  }

  private async collectStream(
    messages: OpenAIChatMessage[],
    tools: OpenAIChatTool[] = []
  ): Promise<{ textParts: string[]; toolCalls: OpenAIToolCall[] }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await fetch(`${this.config.openAiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.openAiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.config.openAiModel,
          messages,
          temperature: this.config.openAiTemperature,
          stream: true,
          ...(tools.length > 0 ? { tools, tool_choice: "auto" } : {})
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`OpenAI compatible stream failed: HTTP ${response.status}`);
      }

      const decoder = new TextDecoder();
      const textParts: string[] = [];
      const toolCalls = new Map<number, OpenAIToolCall>();
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
          const parsed = this.streamParser.parseDataLine(line);
          textParts.push(...(parsed.text ? [parsed.text] : []));
          this.streamParser.mergeToolCallDeltas(toolCalls, parsed.toolCalls);
        }
      }
      return { textParts, toolCalls: [...toolCalls.entries()].sort(([left], [right]) => left - right).map(([, value]) => value) };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseToolArguments(rawArguments: string): JsonObject {
    try {
      const parsed = JSON.parse(rawArguments || "{}") as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject;
      }
    } catch {
      return {};
    }
    return {};
  }
}
