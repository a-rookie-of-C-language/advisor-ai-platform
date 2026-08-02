import { WebFetchContextBuilder as WebFetchContextBuilderClass } from "../../../web/context/fetch/core/WebFetchContextBuilder.js";
import { WebSearchContextBuilder as WebSearchContextBuilderClass } from "../../../web/context/search/core/WebSearchContextBuilder.js";
import type { AgentWebClients } from "../model/AgentWebClients.js";
import { AgentWebContextBuilders } from "../model/AgentWebContextBuilders.js";

export class AgentWebContextBuildersFactory {
  create(webClients: AgentWebClients): AgentWebContextBuilders {
    return new AgentWebContextBuilders(
      webClients.webFetchClient ? new WebFetchContextBuilderClass(webClients.webFetchClient) : undefined,
      webClients.webSearchClient ? new WebSearchContextBuilderClass(webClients.webSearchClient) : undefined
    );
  }
}
