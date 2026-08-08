import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import type { MemoryContextBuilder } from "../../../../memory/context/core/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../../../memory/task/submitter/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../../../../openai/chat/core/client/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../../../openai/tools/registry/core/registry/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../../../../rag/context/core/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../../../web/context/search/core/WebSearchContextBuilder.js";
import { AgentChatStreamSession } from "../../../session/core/AgentChatStreamSession.js";
import { AgentChatStreamSessionFactory } from "../../../session/factory/AgentChatStreamSessionFactory.js";

export class AgentRuntimeComponents {
  readonly streamSession: AgentChatStreamSession;
  private readonly streamSessionFactory = new AgentChatStreamSessionFactory();

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
    this.streamSession = this.streamSessionFactory.create(
      config,
      openAiClient,
      memoryContextBuilder,
      memoryTaskSubmitter,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder,
      openAiToolRegistry
    );
  }
}
