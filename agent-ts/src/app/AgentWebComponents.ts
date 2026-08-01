import type { AgentConfig } from "../config/AgentConfig.js";
import { WebFetchClient } from "../web/WebFetchClient.js";
import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import { WebFetchContextBuilder as WebFetchContextBuilderClass } from "../web/WebFetchContextBuilder.js";
import { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import { WebSearchClient } from "../web/WebSearchClient.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";
import { WebSearchContextBuilder as WebSearchContextBuilderClass } from "../web/WebSearchContextBuilder.js";

export class AgentWebComponents {
  readonly fetchContextBuilder?: WebFetchContextBuilder;
  readonly openAiToolBridge: WebOpenAiToolBridge;
  readonly searchContextBuilder?: WebSearchContextBuilder;

  constructor(config: AgentConfig) {
    const webFetchClient = config.webFetchEnabled ? new WebFetchClient(config) : undefined;
    const webSearchClient = config.webSearchEnabled && config.webSearchApiKey ? new WebSearchClient(config) : undefined;
    this.fetchContextBuilder = webFetchClient ? new WebFetchContextBuilderClass(webFetchClient) : undefined;
    this.searchContextBuilder = webSearchClient ? new WebSearchContextBuilderClass(webSearchClient) : undefined;
    this.openAiToolBridge = new WebOpenAiToolBridge(webFetchClient, webSearchClient);
  }
}
