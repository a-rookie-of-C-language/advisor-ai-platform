import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentChatStreamSession } from "./AgentChatStreamSession.js";
import { AgentContextPipeline } from "./AgentContextPipeline.js";
import type { MemoryContextBuilder } from "../memory/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../memory/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../openai/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../openai/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../rag/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";
import { AgentMemoryTaskCompletionSubmitter } from "./AgentMemoryTaskCompletionSubmitter.js";
import { AgentOpenAiToolFacade } from "./AgentOpenAiToolFacade.js";
import { AgentToolExecutorFactory } from "./AgentToolExecutorFactory.js";

export class AgentRuntimeComponents {
  readonly streamSession: AgentChatStreamSession;

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
    const contextPipeline = new AgentContextPipeline(
      memoryContextBuilder,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder
    );
    const memoryTaskCompletionSubmitter = new AgentMemoryTaskCompletionSubmitter(memoryTaskSubmitter);
    const openAiToolFacade = new AgentOpenAiToolFacade(config.openAiApiKey, openAiToolRegistry);
    const toolExecutorFactory = new AgentToolExecutorFactory(openAiToolFacade);
    this.streamSession = new AgentChatStreamSession(
      config.openAiApiKey,
      contextPipeline,
      memoryTaskCompletionSubmitter,
      openAiClient,
      openAiToolFacade,
      toolExecutorFactory
    );
  }
}
