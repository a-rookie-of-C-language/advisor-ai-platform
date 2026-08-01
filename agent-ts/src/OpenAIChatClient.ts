import type { AgentConfig } from "./AgentConfig.js";
import type { ChatMessageDTO } from "./ChatStreamRequest.js";

interface OpenAIStreamChoice {
  delta?: {
    content?: string;
  };
}

interface OpenAIStreamChunk {
  choices?: OpenAIStreamChoice[];
}

export class OpenAIChatClient {
  constructor(private readonly config: AgentConfig) {}

  async *streamChat(messages: ChatMessageDTO[]): AsyncGenerator<string> {
    if (!this.config.openAiApiKey) {
      return;
    }

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
          messages: messages.map((message) => ({ role: message.role, content: message.content })),
          temperature: this.config.openAiTemperature,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`OpenAI compatible stream failed: HTTP ${response.status}`);
      }

      const decoder = new TextDecoder();
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
          const text = this.parseDataLine(line);
          if (text) {
            yield text;
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseDataLine(line: string): string {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return "";
    }
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") {
      return "";
    }
    const chunk = JSON.parse(data) as OpenAIStreamChunk;
    return chunk.choices?.[0]?.delta?.content || "";
  }
}
