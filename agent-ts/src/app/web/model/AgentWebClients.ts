import type { WebFetchClient } from "../../../web/fetch/core/WebFetchClient.js";
import type { WebSearchClient } from "../../../web/search/core/WebSearchClient.js";

export class AgentWebClients {
  constructor(
    readonly webFetchClient?: WebFetchClient,
    readonly webSearchClient?: WebSearchClient
  ) {}
}
