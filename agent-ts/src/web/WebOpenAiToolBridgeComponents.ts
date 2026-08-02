import type { WebFetchClient } from "./WebFetchClient.js";
import { WebOpenAiToolCatalog } from "./WebOpenAiToolCatalog.js";
import { WebOpenAiToolExecutor } from "./WebOpenAiToolExecutor.js";
import type { WebSearchClient } from "./WebSearchClient.js";
import { WebToolAvailabilityFactory } from "./WebToolAvailabilityFactory.js";
import { WebToolNameMatcher } from "./WebToolNameMatcher.js";

export class WebOpenAiToolBridgeComponents {
  readonly availabilityFactory = new WebToolAvailabilityFactory();
  readonly catalog = new WebOpenAiToolCatalog();
  readonly executor: WebOpenAiToolExecutor;
  readonly toolNameMatcher = new WebToolNameMatcher();

  constructor(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient) {
    this.executor = new WebOpenAiToolExecutor(webFetchClient, webSearchClient);
  }
}
