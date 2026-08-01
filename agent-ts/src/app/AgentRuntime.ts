import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentConfig } from "../config/AgentConfig.js";
import type { AgentCoreClient } from "../core/AgentCoreClient.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryContextBuilder } from "../memory/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../memory/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../openai/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../openai/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../rag/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";
import { AgentGraphHealthDescriptor } from "./AgentGraphHealthDescriptor.js";
import { AgentRuntimeComponents } from "./AgentRuntimeComponents.js";
import { AgentRequestIdResolver } from "./AgentRequestIdResolver.js";
import { SseWriter } from "../protocol/SseWriter.js";
import { validateChatStreamRequest } from "../common/validateChatStreamRequest.js";

export class AgentRuntime {
  private readonly components: AgentRuntimeComponents;
  private readonly graphHealthDescriptor = new AgentGraphHealthDescriptor();
  private readonly requestIdResolver = new AgentRequestIdResolver();

  constructor(
    config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly openAiClient: OpenAIChatClient,
    memoryContextBuilder?: MemoryContextBuilder,
    memoryTaskSubmitter?: MemoryTaskSubmitter,
    ragContextBuilder?: RagContextBuilder,
    webFetchContextBuilder?: WebFetchContextBuilder,
    webSearchContextBuilder?: WebSearchContextBuilder,
    openAiToolRegistry?: OpenAiToolRegistry
  ) {
    this.components = new AgentRuntimeComponents(
      config,
      this.openAiClient,
      memoryContextBuilder,
      memoryTaskSubmitter,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder,
      openAiToolRegistry
    );
  }

  async coreHealth(): Promise<JsonObject> {
    return this.core.health();
  }

  graphHealth(): JsonObject {
    return this.graphHealthDescriptor.describe();
  }

  async streamChat(body: unknown, request: IncomingMessage, response: ServerResponse): Promise<void> {
    const chatRequest = validateChatStreamRequest(body);
    const traceId = this.requestIdResolver.resolveTraceId(chatRequest, request);
    const turnId = this.requestIdResolver.resolveTurnId(chatRequest, request);
    const writer = new SseWriter(response, this.core, traceId);
    await this.components.streamSession.stream(chatRequest, turnId, writer);
  }
}
