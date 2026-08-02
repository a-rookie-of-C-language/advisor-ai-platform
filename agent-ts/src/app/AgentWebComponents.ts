import type { AgentConfig } from "../config/AgentConfig.js";
import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import { WebFetchContextBuilder as WebFetchContextBuilderClass } from "../web/WebFetchContextBuilder.js";
import { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";
import { WebSearchContextBuilder as WebSearchContextBuilderClass } from "../web/WebSearchContextBuilder.js";
import { AgentWebClientsFactory } from "./AgentWebClientsFactory.js";

export class AgentWebComponents {
  readonly fetchContextBuilder?: WebFetchContextBuilder;
  readonly openAiToolBridge: WebOpenAiToolBridge;
  readonly searchContextBuilder?: WebSearchContextBuilder;

  constructor(config: AgentConfig) {
    const webClients = new AgentWebClientsFactory().create(config);
    const webFetchClient = webClients.webFetchClient;
    const webSearchClient = webClients.webSearchClient;
    this.fetchContextBuilder = webFetchClient ? new WebFetchContextBuilderClass(webFetchClient) : undefined;
    this.searchContextBuilder = webSearchClient ? new WebSearchContextBuilderClass(webSearchClient) : undefined;
    this.openAiToolBridge = new WebOpenAiToolBridge(webFetchClient, webSearchClient);
  }
}
