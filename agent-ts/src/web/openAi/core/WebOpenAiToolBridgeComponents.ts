import type { WebFetchClient } from "../../fetch/core/WebFetchClient.js";
import type { WebSearchClient } from "../../search/core/WebSearchClient.js";
import { WebToolAvailabilityFactory } from "../availability/WebToolAvailabilityFactory.js";
import { WebOpenAiToolCatalog } from "../catalog/WebOpenAiToolCatalog.js";
import { WebOpenAiToolExecutor } from "../execution/WebOpenAiToolExecutor.js";
import { WebToolNameMatcher } from "../matching/WebToolNameMatcher.js";

export class WebOpenAiToolBridgeComponents {
  readonly availabilityFactory = new WebToolAvailabilityFactory();
  readonly catalog = new WebOpenAiToolCatalog();
  readonly executor: WebOpenAiToolExecutor;
  readonly toolNameMatcher = new WebToolNameMatcher();

  constructor(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient) {
    this.executor = new WebOpenAiToolExecutor(webFetchClient, webSearchClient);
  }
}
