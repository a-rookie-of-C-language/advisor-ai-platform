import type { AgentConfig } from "./AgentConfig.js";
import { OpenAIChatCompletionRequestBuilder } from "./OpenAIChatCompletionRequestBuilder.js";
import { OpenAIChatResponseBodyCollector } from "./OpenAIChatResponseBodyCollector.js";
import type { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import type { OpenAIChatRoundResult } from "./OpenAIChatRoundResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";

export class OpenAIChatCompletionStreamer {
  private readonly requestBuilder: OpenAIChatCompletionRequestBuilder;
  private readonly responseBodyCollector = new OpenAIChatResponseBodyCollector();

  constructor(private readonly config: AgentConfig) {
    this.requestBuilder = new OpenAIChatCompletionRequestBuilder(config);
  }

  async collectStream(messages: OpenAIChatMessage[], tools: OpenAIChatTool[] = []): Promise<OpenAIChatRoundResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const request = this.requestBuilder.build(messages, tools, controller.signal);
      const response = await fetch(request.url, request.init);

      if (!response.ok || !response.body) {
        throw new Error(`OpenAI compatible stream failed: HTTP ${response.status}`);
      }

      return this.responseBodyCollector.collect(response.body);
    } finally {
      clearTimeout(timeout);
    }
  }
}
