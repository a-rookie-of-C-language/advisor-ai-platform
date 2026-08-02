import { WebFetchContextBuilder as WebFetchContextBuilderClass } from "../../web/context/fetch/core/WebFetchContextBuilder.js";
import { WebSearchContextBuilder as WebSearchContextBuilderClass } from "../../web/context/WebSearchContextBuilder.js";
import type { AgentWebClients } from "./AgentWebClients.js";
import { AgentWebContextBuilders } from "./AgentWebContextBuilders.js";

export class AgentWebContextBuildersFactory {
  create(webClients: AgentWebClients): AgentWebContextBuilders {
    return new AgentWebContextBuilders(
      webClients.webFetchClient ? new WebFetchContextBuilderClass(webClients.webFetchClient) : undefined,
      webClients.webSearchClient ? new WebSearchContextBuilderClass(webClients.webSearchClient) : undefined
    );
  }
}
