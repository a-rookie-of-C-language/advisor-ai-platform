import type { MemoryContextBuilder } from "../../memory/context/MemoryContextBuilder.js";
import type { RagContextBuilder } from "../../rag/context/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../web/context/search/core/WebSearchContextBuilder.js";
import { AgentContextPipeline } from "./AgentContextPipeline.js";

export class AgentContextPipelineFactory {
  create(
    memoryContextBuilder?: MemoryContextBuilder,
    ragContextBuilder?: RagContextBuilder,
    webFetchContextBuilder?: WebFetchContextBuilder,
    webSearchContextBuilder?: WebSearchContextBuilder
  ): AgentContextPipeline {
    return new AgentContextPipeline(memoryContextBuilder, ragContextBuilder, webFetchContextBuilder, webSearchContextBuilder);
  }
}
