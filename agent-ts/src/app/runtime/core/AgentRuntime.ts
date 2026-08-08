import type { IncomingMessage, ServerResponse } from "node:http";
import type { JsonObject } from "../../../common/json/JsonTypes.js";
import { validateChatStreamRequest } from "../../../common/request/validation/validateChatStreamRequest.js";
import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import type { AgentCoreClient } from "../../../core/client/AgentCoreClient.js";
import type { MemoryContextBuilder } from "../../../memory/context/core/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../../../memory/task/submitter/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../../../openai/chat/core/OpenAIChatClient.js";
import type { OpenAiToolRegistry } from "../../../openai/tools/registry/core/registry/OpenAiToolRegistry.js";
import { SseWriterFactory } from "../../../protocol/sse/factory/SseWriterFactory.js";
import type { RagContextBuilder } from "../../../rag/context/core/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../../../web/context/fetch/core/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../../../web/context/search/core/WebSearchContextBuilder.js";
import { AgentGraphHealthDescriptor } from "../../health/core/AgentGraphHealthDescriptor.js";
import { AgentRequestIdResolver } from "../../request/core/AgentRequestIdResolver.js";
import { AgentRuntimeComponents } from "../model/AgentRuntimeComponents.js";

export class AgentRuntime {
  private readonly components: AgentRuntimeComponents;
  private readonly graphHealthDescriptor = new AgentGraphHealthDescriptor();
  private readonly requestIdResolver = new AgentRequestIdResolver();
  private readonly sseWriterFactory = new SseWriterFactory();

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
    const writer = this.sseWriterFactory.create(response, this.core, traceId);
    await this.components.streamSession.stream(chatRequest, turnId, writer);
  }
}
