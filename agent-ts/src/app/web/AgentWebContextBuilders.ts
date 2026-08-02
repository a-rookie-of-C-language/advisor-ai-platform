import type { WebFetchContextBuilder } from "../../web/context/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../web/context/WebSearchContextBuilder.js";

export class AgentWebContextBuilders {
  constructor(
    readonly fetchContextBuilder?: WebFetchContextBuilder,
    readonly searchContextBuilder?: WebSearchContextBuilder
  ) {}
}
