import type { WebFetchClient } from "../fetch/WebFetchClient.js";
import type { WebSearchClient } from "../search/WebSearchClient.js";
import { WebOpenAiToolBridgeComponents } from "./core/WebOpenAiToolBridgeComponents.js";

export class WebOpenAiToolBridgeComponentsFactory {
  create(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient): WebOpenAiToolBridgeComponents {
    return new WebOpenAiToolBridgeComponents(webFetchClient, webSearchClient);
  }
}
