import type { AgentConfig } from "../../config/model/AgentConfig.js";
import { WebFetchClient } from "../../web/WebFetchClient.js";
import { WebSearchClient } from "../../web/search/WebSearchClient.js";
import { AgentWebClients } from "./AgentWebClients.js";

export class AgentWebClientsFactory {
  create(config: AgentConfig): AgentWebClients {
    return new AgentWebClients(
      config.webFetchEnabled ? new WebFetchClient(config) : undefined,
      config.webSearchEnabled && config.webSearchApiKey ? new WebSearchClient(config) : undefined
    );
  }
}
