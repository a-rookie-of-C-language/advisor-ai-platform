import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import { WebFetchClient } from "../../../../web/fetch/core/WebFetchClient.js";
import { WebSearchClient } from "../../../../web/search/core/WebSearchClient.js";
import { AgentWebClients } from "../../model/clients/AgentWebClients.js";

export class AgentWebClientsFactory {
  create(config: AgentConfig): AgentWebClients {
    return new AgentWebClients(
      config.webFetchEnabled ? new WebFetchClient(config) : undefined,
      config.webSearchEnabled && config.webSearchApiKey ? new WebSearchClient(config) : undefined
    );
  }
}
