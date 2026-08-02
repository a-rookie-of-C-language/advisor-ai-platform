import type { AgentConfig } from "../../config/model/AgentConfig.js";
import { AgentChatStreamSession } from "../session/AgentChatStreamSession.js";
import { AgentChatStreamSessionFactory } from "../session/AgentChatStreamSessionFactory.js";
import type { MemoryContextBuilder } from "../../memory/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../memory/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../../openai/chat/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../openai/tools/registry/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../../rag/context/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../web/context/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../web/context/WebSearchContextBuilder.js";

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
