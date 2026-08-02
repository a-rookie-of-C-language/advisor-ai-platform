import type { WebFetchClient } from "../fetch/WebFetchClient.js";
import type { WebSearchClient } from "../search/WebSearchClient.js";
import { WebOpenAiToolCatalog } from "./catalog/WebOpenAiToolCatalog.js";
import { WebOpenAiToolExecutor } from "./WebOpenAiToolExecutor.js";
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
