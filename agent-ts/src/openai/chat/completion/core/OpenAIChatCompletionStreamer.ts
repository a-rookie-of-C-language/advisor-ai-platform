import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import { OpenAIChatCompletionHttpClient } from "../http/OpenAIChatCompletionHttpClient.js";
import { OpenAIChatCompletionRequestBuilder } from "../factory/OpenAIChatCompletionRequestBuilder.js";
import { OpenAIChatResponseBodyCollector } from "../reader/OpenAIChatResponseBodyCollector.js";
import type { OpenAIChatMessage } from "../../model/message/OpenAIChatMessage.js";
import type { OpenAIChatRoundResult } from "../../model/round/OpenAIChatRoundResult.js";
import type { OpenAIChatTool } from "../../model/tool/OpenAIChatTool.js";

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
