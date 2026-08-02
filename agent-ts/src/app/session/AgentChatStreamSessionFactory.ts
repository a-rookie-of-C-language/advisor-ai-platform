import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { MemoryContextBuilder } from "../../memory/context/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../memory/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../../openai/chat/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../openai/tools/registry/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../../rag/context/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../web/context/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../web/context/WebSearchContextBuilder.js";
import { AgentChatStreamSession } from "./AgentChatStreamSession.js";
import { AgentContextPipelineFactory } from "./AgentContextPipelineFactory.js";
import { AgentMemoryTaskCompletionSubmitter } from "../memory/AgentMemoryTaskCompletionSubmitter.js";
import { AgentOpenAiToolComponentsFactory } from "../openAi/AgentOpenAiToolComponentsFactory.js";

export class AgentChatStreamSessionFactory {
  private readonly contextPipelineFactory = new AgentContextPipelineFactory();
  private readonly openAiToolComponentsFactory = new AgentOpenAiToolComponentsFactory();

  create(
    config: AgentConfig,
    openAiClient: OpenAIChatClient,
    memoryContextBuilder?: MemoryContextBuilder,
    memoryTaskSubmitter?: MemoryTaskSubmitter,
    ragContextBuilder?: RagContextBuilder,
    webFetchContextBuilder?: WebFetchContextBuilder,
    webSearchContextBuilder?: WebSearchContextBuilder,
    openAiToolRegistry?: OpenAiToolRegistry
  ): AgentChatStreamSession {
    const contextPipeline = this.contextPipelineFactory.create(
      memoryContextBuilder,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder
    );
    const memoryTaskCompletionSubmitter = new AgentMemoryTaskCompletionSubmitter(memoryTaskSubmitter);
    const openAiToolComponents = this.openAiToolComponentsFactory.create(config.openAiApiKey, openAiToolRegistry);
    return new AgentChatStreamSession(
      config.openAiApiKey,
      contextPipeline,
      memoryTaskCompletionSubmitter,
      openAiClient,
      openAiToolComponents.openAiToolFacade,
      openAiToolComponents.toolExecutorFactory
    );
  }
}
