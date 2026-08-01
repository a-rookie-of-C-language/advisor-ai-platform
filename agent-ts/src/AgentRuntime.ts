import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentConfig } from "./AgentConfig.js";
import type { AgentCoreClient } from "./AgentCoreClient.js";
import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { MemoryContextBuilder } from "./MemoryContextBuilder.js";
import type { MemoryTaskSubmitter } from "./MemoryTaskSubmitter.js";
import type { McpOpenAiToolBridge } from "./McpOpenAiToolBridge.js";
import type { OpenAIChatClient } from "./OpenAIChatClient.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagContextBuilder } from "./RagContextBuilder.js";
import type { WebFetchContextBuilder } from "./WebFetchContextBuilder.js";
import type { WebSearchContextBuilder } from "./WebSearchContextBuilder.js";
import { SseWriter } from "./SseWriter.js";
import { validateChatStreamRequest } from "./validateChatStreamRequest.js";

export class AgentRuntime {
  constructor(
    private readonly config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly openAiClient: OpenAIChatClient,
    private readonly memoryContextBuilder?: MemoryContextBuilder,
    private readonly memoryTaskSubmitter?: MemoryTaskSubmitter,
    private readonly ragContextBuilder?: RagContextBuilder,
    private readonly webFetchContextBuilder?: WebFetchContextBuilder,
    private readonly webSearchContextBuilder?: WebSearchContextBuilder,
    private readonly mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {}

  async coreHealth(): Promise<JsonObject> {
    return this.core.health();
  }

  graphHealth(): JsonObject {
    return {
      compiled: true,
      checkpoint: "typescript-runtime",
      nodes: [
        "validate_request",
        "load_memory",
        "load_rag",
        "load_web_fetch",
        "load_web_search",
        "load_mcp_tools",
        "generate",
        "finalize"
      ],
      runtime: "typescript",
      core: "rust"
    };
  }

  async streamChat(body: unknown, request: IncomingMessage, response: ServerResponse): Promise<void> {
    const chatRequest = validateChatStreamRequest(body);
    const traceId = this.resolveTraceId(chatRequest, request);
    const turnId = this.resolveTurnId(chatRequest, request);
    const writer = new SseWriter(response, this.core, traceId);

    await writer.start();
    try {
      const modelMessages = await this.buildModelMessages(chatRequest);
      const tools = await this.loadOpenAiTools();
      const mcpOpenAiToolBridge = this.mcpOpenAiToolBridge;
      const toolExecutor = mcpOpenAiToolBridge
        ? (toolName: string, toolArgs: JsonObject) => mcpOpenAiToolBridge.executeTool(toolName, toolArgs)
        : undefined;
      let answer = "";
      let emitted = false;
      for await (const event of this.openAiClient.streamChatEvents(modelMessages, tools, toolExecutor)) {
        if (event.type === "delta") {
          emitted = true;
          answer += event.text;
          await writer.write("llm_delta", "llm", { text: event.text });
        } else if (event.type === "tool_call") {
          await writer.write("tool_call", "tool", {
            tool_call_id: event.toolCallId,
            tool_name: event.toolName,
            tool_args: event.toolArgs
          });
        } else {
          await writer.write("tool_result", "tool", {
            tool_call_id: event.toolCallId,
            tool_name: event.toolName,
            tool_output: event.toolOutput,
            success: event.success
          });
        }
      }

      if (!emitted && !this.config.openAiApiKey) {
        answer = "TS agent 已启动，但当前未配置 OPENAI_API_KEY，无法调用模型。";
        await writer.write("llm_delta", "llm", { text: answer });
      }

      await writer.done("stream_finished");
      await this.submitMemoryTask(chatRequest, turnId, answer);
    } catch (error) {
      await writer.error("internal_error", error instanceof Error ? error.message : "agent stream failed", true);
    }
  }

  private resolveTraceId(chatRequest: ChatStreamRequest, request: IncomingMessage): string {
    return String(request.headers["x-trace-id"] || chatRequest.traceId || "");
  }

  private resolveTurnId(chatRequest: ChatStreamRequest, request: IncomingMessage): string {
    return String(request.headers["x-turn-id"] || chatRequest.turnId || "");
  }

  private async buildModelMessages(chatRequest: ChatStreamRequest): Promise<ChatStreamRequest["messages"]> {
    let messages = chatRequest.messages;
    if (this.memoryContextBuilder) {
      messages = await this.memoryContextBuilder.injectMemory({ ...chatRequest, messages });
    }
    if (this.ragContextBuilder) {
      messages = await this.ragContextBuilder.injectRag({ ...chatRequest, messages });
    }
    if (this.webFetchContextBuilder) {
      messages = await this.webFetchContextBuilder.injectWebFetch({ ...chatRequest, messages });
    }
    if (this.webSearchContextBuilder) {
      messages = await this.webSearchContextBuilder.injectWebSearch({ ...chatRequest, messages });
    }
    return messages;
  }

  private async loadOpenAiTools(): Promise<OpenAIChatTool[]> {
    if (!this.mcpOpenAiToolBridge || !this.config.openAiApiKey) {
      return [];
    }
    try {
      return await this.mcpOpenAiToolBridge.listTools();
    } catch {
      return [];
    }
  }

  private async submitMemoryTask(chatRequest: ChatStreamRequest, turnId: string, answer: string): Promise<void> {
    if (!this.memoryTaskSubmitter || !turnId || !answer.trim()) {
      return;
    }
    await this.memoryTaskSubmitter.submit(chatRequest, turnId, answer);
  }
}
