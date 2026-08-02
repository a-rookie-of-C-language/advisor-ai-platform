import type { WebFetchClient } from "./fetch/WebFetchClient.js";
import { WebOpenAiToolBridgeComponents } from "./WebOpenAiToolBridgeComponents.js";
import type { WebSearchClient } from "./search/WebSearchClient.js";

export class WebOpenAiToolBridgeComponentsFactory {
  create(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient): WebOpenAiToolBridgeComponents {
    return new WebOpenAiToolBridgeComponents(webFetchClient, webSearchClient);
  }
}
