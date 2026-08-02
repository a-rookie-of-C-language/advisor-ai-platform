import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";

export class AgentWebContextBuilders {
  constructor(
    readonly fetchContextBuilder?: WebFetchContextBuilder,
    readonly searchContextBuilder?: WebSearchContextBuilder
  ) {}
}
