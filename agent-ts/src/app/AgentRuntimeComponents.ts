import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentChatStreamSession } from "./AgentChatStreamSession.js";
import { AgentContextPipelineFactory } from "./AgentContextPipelineFactory.js";
import type { MemoryContextBuilder } from "../memory/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../memory/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../openai/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../openai/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../rag/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";
import { AgentMemoryTaskCompletionSubmitter } from "./AgentMemoryTaskCompletionSubmitter.js";
import { AgentOpenAiToolComponentsFactory } from "./AgentOpenAiToolComponentsFactory.js";

export class AgentRuntimeComponents {
  readonly streamSession: AgentChatStreamSession;
  private readonly contextPipelineFactory = new AgentContextPipelineFactory();
  private readonly openAiToolComponentsFactory = new AgentOpenAiToolComponentsFactory();

  constructor(
    config: AgentConfig,
    openAiClient: OpenAIChatClient,
    memoryContextBuilder?: MemoryContextBuilder,
    memoryTaskSubmitter?: MemoryTaskSubmitter,
    ragContextBuilder?: RagContextBuilder,
    webFetchContextBuilder?: WebFetchContextBuilder,
    webSearchContextBuilder?: WebSearchContextBuilder,
    openAiToolRegistry?: OpenAiToolRegistry
  ) {
    const contextPipeline = this.contextPipelineFactory.create(
      memoryContextBuilder,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder
    );
    const memoryTaskCompletionSubmitter = new AgentMemoryTaskCompletionSubmitter(memoryTaskSubmitter);
    const openAiToolComponents = this.openAiToolComponentsFactory.create(config.openAiApiKey, openAiToolRegistry);
    this.streamSession = new AgentChatStreamSession(
      config.openAiApiKey,
      contextPipeline,
      memoryTaskCompletionSubmitter,
      openAiClient,
      openAiToolComponents.openAiToolFacade,
      openAiToolComponents.toolExecutorFactory
    );
  }
}
