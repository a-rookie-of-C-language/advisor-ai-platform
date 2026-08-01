import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentContextPipeline } from "./AgentContextPipeline.js";
import type { AgentCoreClient } from "../core/AgentCoreClient.js";
import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryContextBuilder } from "../memory/MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "../memory/MemoryTaskSubmitter.js";
import type { OpenAIChatClient } from "../openai/OpenAIChatClient.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "../openai/OpenAIChatTool.js";
import type { OpenAiToolRegistry } from "../openai/OpenAiToolRegistry.js";
import type { RagContextBuilder } from "../rag/RagContextBuilder.js";
import type { WebFetchContextBuilder } from "../web/WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "../web/WebSearchContextBuilder.js";
import { AgentGraphHealthDescriptor } from "./AgentGraphHealthDescriptor.js";
import { AgentRequestIdResolver } from "./AgentRequestIdResolver.js";
import { AgentStreamEventWriter } from "../protocol/AgentStreamEventWriter.js";
import { OpenAiToolResultFactory } from "../openai/OpenAiToolResultFactory.js";
import { SseWriter } from "../protocol/SseWriter.js";
import { validateChatStreamRequest } from "../common/validateChatStreamRequest.js";

export class AgentRuntime {
  private readonly contextPipeline: AgentContextPipeline;
  private readonly graphHealthDescriptor = new AgentGraphHealthDescriptor();
  private readonly requestIdResolver = new AgentRequestIdResolver();

  constructor(
    private readonly config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly openAiClient: OpenAIChatClient,
    memoryContextBuilder?: MemoryContextBuilder,
    private readonly memoryTaskSubmitter?: MemoryTaskSubmitter,
    ragContextBuilder?: RagContextBuilder,
    webFetchContextBuilder?: WebFetchContextBuilder,
    webSearchContextBuilder?: WebSearchContextBuilder,
    private readonly openAiToolRegistry?: OpenAiToolRegistry
  ) {
    this.contextPipeline = new AgentContextPipeline(
      memoryContextBuilder,
      ragContextBuilder,
      webFetchContextBuilder,
      webSearchContextBuilder
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
    const eventWriter = new AgentStreamEventWriter(writer);

    await writer.start();
    try {
      const modelMessages = await this.contextPipeline.build(chatRequest);
      const tools = await this.loadOpenAiTools();
      const toolExecutor = tools.length > 0 ? (toolName: string, toolArgs: JsonObject) => this.executeOpenAiTool(chatRequest, toolName, toolArgs) : undefined;
      for await (const event of this.openAiClient.streamChatEvents(modelMessages, tools, toolExecutor)) {
        await eventWriter.write(event);
      }

      if (!eventWriter.emitted && !this.config.openAiApiKey) {
        await eventWriter.writeMissingOpenAiApiKeyFallback();
      }

      await writer.done("stream_finished");
      await this.submitMemoryTask(chatRequest, turnId, eventWriter.answer);
    } catch (error) {
      await writer.error("internal_error", error instanceof Error ? error.message : "agent stream failed", true);
    }
  }

  private async loadOpenAiTools(): Promise<OpenAIChatTool[]> {
    if (!this.config.openAiApiKey || !this.openAiToolRegistry) {
      return [];
    }
    return this.openAiToolRegistry.listTools();
  }

  private async executeOpenAiTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.openAiToolRegistry
      ? this.openAiToolRegistry.executeTool(chatRequest, toolName, toolArgs)
      : OpenAiToolResultFactory.error(`未知工具: ${toolName}`);
  }

  private async submitMemoryTask(chatRequest: ChatStreamRequest, turnId: string, answer: string): Promise<void> {
    if (!this.memoryTaskSubmitter || !turnId || !answer.trim()) {
      return;
    }
    await this.memoryTaskSubmitter.submit(chatRequest, turnId, answer);
  }
}
