import type { MemoryContextBuilder } from "../../memory/MemoryContextBuilder.js";
import type { RagContextBuilder } from "../../rag/context/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../web/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../web/WebSearchContextBuilder.js";
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
