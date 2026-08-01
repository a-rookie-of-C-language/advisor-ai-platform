import type { AgentConfig } from "./AgentConfig.js";
import { WebFetchClient } from "./WebFetchClient.js";
import type { WebFetchContextBuilder } from "./WebFetchContextBuilder.js";
import { WebFetchContextBuilder as WebFetchContextBuilderClass } from "./WebFetchContextBuilder.js";
import { WebOpenAiToolBridge } from "./WebOpenAiToolBridge.js";
import { WebSearchClient } from "./WebSearchClient.js";
import type { WebSearchContextBuilder } from "./WebSearchContextBuilder.js";
import { WebSearchContextBuilder as WebSearchContextBuilderClass } from "./WebSearchContextBuilder.js";

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
