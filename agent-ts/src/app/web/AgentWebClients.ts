import type { WebFetchClient } from "../../web/fetch/WebFetchClient.js";
import type { WebSearchClient } from "../../web/search/WebSearchClient.js";

export class AgentWebClients {
  constructor(
    readonly webFetchClient?: WebFetchClient,
    readonly webSearchClient?: WebSearchClient
  ) {}
}
