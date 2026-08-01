import type { AgentConfig } from "./config/AgentConfig.js";
import type { OpenAIChatCompletionRequest } from "./OpenAIChatCompletionRequest.js";

export class OpenAIChatCompletionHttpClient {
  constructor(private readonly config: AgentConfig) {}

  async fetchStream<T>(
    buildRequest: (signal: AbortSignal) => OpenAIChatCompletionRequest,
    consumeBody: (body: ReadableStream<Uint8Array>) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const request = buildRequest(controller.signal);
      const response = await fetch(request.url, request.init);

      if (!response.ok || !response.body) {
        throw new Error(`OpenAI compatible stream failed: HTTP ${response.status}`);
      }

      return consumeBody(response.body);
    } finally {
      clearTimeout(timeout);
    }
  }
}
