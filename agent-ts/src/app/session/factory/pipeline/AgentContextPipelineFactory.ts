import type { MemoryContextBuilder } from "../../../../memory/context/core/MemoryContextBuilder.js";
import type { WebFetchContextBuilder } from "../../../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../../../web/context/search/core/WebSearchContextBuilder.js";
import { AgentContextPipeline } from "../../core/pipeline/AgentContextPipeline.js";

export class AgentContextPipelineFactory {
  create(
    memoryContextBuilder?: MemoryContextBuilder,
    webFetchContextBuilder?: WebFetchContextBuilder,
    webSearchContextBuilder?: WebSearchContextBuilder
  ): AgentContextPipeline {
    return new AgentContextPipeline(memoryContextBuilder, webFetchContextBuilder, webSearchContextBuilder);
  }
}
