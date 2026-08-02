import type { WebFetchClient } from "../web/WebFetchClient.js";
import type { WebSearchClient } from "../web/WebSearchClient.js";

export class AgentWebClients {
  constructor(
    readonly webFetchClient?: WebFetchClient,
    readonly webSearchClient?: WebSearchClient
  ) {}
}
