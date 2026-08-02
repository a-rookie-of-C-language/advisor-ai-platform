import type { WebFetchClient } from "../../fetch/core/WebFetchClient.js";
import type { WebSearchClient } from "../../search/core/WebSearchClient.js";
import { WebOpenAiToolBridgeComponents } from "../core/WebOpenAiToolBridgeComponents.js";

export class WebOpenAiToolBridgeComponentsFactory {
  create(webFetchClient?: WebFetchClient, webSearchClient?: WebSearchClient): WebOpenAiToolBridgeComponents {
    return new WebOpenAiToolBridgeComponents(webFetchClient, webSearchClient);
  }
}
