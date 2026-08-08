import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import type { MemoryContextBuilder } from "../../../../memory/context/core/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../../../memory/task/submitter/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../../../../openai/chat/core/client/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../../../openai/tools/registry/core/registry/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../../../../rag/context/core/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../../../web/context/search/core/WebSearchContextBuilder.js";
import { AgentMemoryTaskCompletionSubmitter } from "../../../memory/execution/AgentMemoryTaskCompletionSubmitter.js";
import { AgentOpenAiToolComponentsFactory } from "../../../openAi/factory/components/AgentOpenAiToolComponentsFactory.js";
import { AgentChatStreamSession } from "../../core/stream/AgentChatStreamSession.js";
import { AgentContextPipelineFactory } from "../pipeline/AgentContextPipelineFactory.js";

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
