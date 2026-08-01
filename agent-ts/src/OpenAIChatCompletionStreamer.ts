import type { AgentConfig } from "./AgentConfig.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import type { OpenAIChatRoundResult } from "./OpenAIChatRoundResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import { OpenAIStreamParser } from "./OpenAIStreamParser.js";
import type { OpenAIToolCall } from "./OpenAIToolCall.js";

export class OpenAIChatCompletionStreamer {
  private readonly streamParser = new OpenAIStreamParser();

  constructor(private readonly config: AgentConfig) {}

  async collectStream(messages: OpenAIChatMessage[], tools: OpenAIChatTool[] = []): Promise<OpenAIChatRoundResult> {
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

      return this.collectResponseBody(response.body);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async collectResponseBody(body: ReadableStream<Uint8Array>): Promise<OpenAIChatRoundResult> {
    const decoder = new TextDecoder();
    const textParts: string[] = [];
    const toolCalls = new Map<number, OpenAIToolCall>();
    let buffer = "";
    for await (const chunk of body) {
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
  }
}
