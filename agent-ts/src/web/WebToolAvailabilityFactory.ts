import type { WebFetchClient } from "./fetch/WebFetchClient.js";
import type { WebSearchClient } from "./search/WebSearchClient.js";

export class WebToolAvailabilityFactory {
  create(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient): { webFetchEnabled: boolean; webSearchEnabled: boolean } {
    return {
      webFetchEnabled: Boolean(webFetchClient),
      webSearchEnabled: Boolean(webSearchClient)
    };
  }
}
