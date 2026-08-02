import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import { OpenAIChatCompletionHttpClient } from "./OpenAIChatCompletionHttpClient.js";
import { OpenAIChatCompletionRequestBuilder } from "./OpenAIChatCompletionRequestBuilder.js";
import { OpenAIChatResponseBodyCollector } from "../OpenAIChatResponseBodyCollector.js";
import type { OpenAIChatMessage } from "../OpenAIChatMessage.js";
import type { OpenAIChatRoundResult } from "../OpenAIChatRoundResult.js";
import type { OpenAIChatTool } from "../OpenAIChatTool.js";

export class OpenAIChatCompletionStreamer {
  private readonly httpClient: OpenAIChatCompletionHttpClient;
  private readonly requestBuilder: OpenAIChatCompletionRequestBuilder;
  private readonly responseBodyCollector = new OpenAIChatResponseBodyCollector();

  constructor(config: AgentConfig) {
    this.httpClient = new OpenAIChatCompletionHttpClient(config);
    this.requestBuilder = new OpenAIChatCompletionRequestBuilder(config);
  }

  async collectStream(messages: OpenAIChatMessage[], tools: OpenAIChatTool[] = []): Promise<OpenAIChatRoundResult> {
    return this.httpClient.fetchStream(
      signal => this.requestBuilder.build(messages, tools, signal),
      body => this.responseBodyCollector.collect(body)
    );
  }
}
