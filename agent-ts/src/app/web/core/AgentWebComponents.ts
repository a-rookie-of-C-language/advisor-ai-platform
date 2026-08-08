import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import type { WebFetchContextBuilder } from "../../../web/context/fetch/core/WebFetchContextBuilder.js";
import { WebOpenAiToolBridge } from "../../../web/openAi/core/bridge/WebOpenAiToolBridge.js";
import type { WebSearchContextBuilder } from "../../../web/context/search/core/WebSearchContextBuilder.js";
import { AgentWebClientsFactory } from "../factory/clients/AgentWebClientsFactory.js";
import { AgentWebContextBuildersFactory } from "../factory/builders/AgentWebContextBuildersFactory.js";

export class AgentWebComponents {
  readonly fetchContextBuilder?: WebFetchContextBuilder;
  readonly openAiToolBridge: WebOpenAiToolBridge;
  readonly searchContextBuilder?: WebSearchContextBuilder;

  constructor(config: AgentConfig) {
    const webClients = new AgentWebClientsFactory().create(config);
    const webFetchClient = webClients.webFetchClient;
    const webSearchClient = webClients.webSearchClient;
    const contextBuilders = new AgentWebContextBuildersFactory().create(webClients);
    this.fetchContextBuilder = contextBuilders.fetchContextBuilder;
    this.searchContextBuilder = contextBuilders.searchContextBuilder;
    this.openAiToolBridge = new WebOpenAiToolBridge(webFetchClient, webSearchClient);
  }
}
