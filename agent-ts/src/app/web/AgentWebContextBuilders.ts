import type { WebFetchContextBuilder } from "../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../web/context/WebSearchContextBuilder.js";

export class AgentWebContextBuilders {
  constructor(
    readonly fetchContextBuilder?: WebFetchContextBuilder,
    readonly searchContextBuilder?: WebSearchContextBuilder
  ) {}
}
