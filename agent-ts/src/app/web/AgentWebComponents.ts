import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { WebFetchContextBuilder } from "../../web/context/WebFetchContextBuilder.js";
import { WebOpenAiToolBridge } from "../../web/openAi/WebOpenAiToolBridge.js";
import type { WebSearchContextBuilder } from "../../web/context/WebSearchContextBuilder.js";
import { AgentWebClientsFactory } from "./AgentWebClientsFactory.js";
import { AgentWebContextBuildersFactory } from "./AgentWebContextBuildersFactory.js";

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
