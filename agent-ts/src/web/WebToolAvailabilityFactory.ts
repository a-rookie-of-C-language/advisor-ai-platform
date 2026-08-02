import type { WebFetchClient } from "./WebFetchClient.js";
import type { WebSearchClient } from "./WebSearchClient.js";

export class WebToolAvailabilityFactory {
  create(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient): { webFetchEnabled: boolean; webSearchEnabled: boolean } {
    return {
      webFetchEnabled: Boolean(webFetchClient),
      webSearchEnabled: Boolean(webSearchClient)
    };
  }
}
