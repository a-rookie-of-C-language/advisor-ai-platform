import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import type { AgentCoreClient } from "../../../../core/client/AgentCoreClient.js";
import type { OpenAIChatClient } from "../../../../openai/chat/core/client/OpenAIChatClient.js";
import type { OpenAIToolCall } from "../../../../openai/tools/runtime/model/call/OpenAIToolCall.js";
import { OpenAIToolConversationAppender } from "../../../../openai/tools/runtime/state/conversation/OpenAIToolConversationAppender.js";
import { OpenAIToolArgumentParser } from "../../../../openai/tools/arguments/parser/OpenAIToolArgumentParser.js";
import { AgentStreamEventWriter } from "../../../../protocol/events/stream/writer/AgentStreamEventWriter.js";
import type { SseWriter } from "../../../../protocol/sse/writer/SseWriter.js";
import type { AgentMemoryTaskCompletionSubmitter } from "../../../memory/execution/AgentMemoryTaskCompletionSubmitter.js";
import type { AgentOpenAiToolFacade } from "../../../openAi/core/AgentOpenAiToolFacade.js";
import type { AgentToolExecutorFactory } from "../../../openAi/factory/executor/AgentToolExecutorFactory.js";
import type { AgentContextPipeline } from "../pipeline/AgentContextPipeline.js";
import { AgentMissingOpenAiApiKeyFallbackGate } from "../../support/fallback/AgentMissingOpenAiApiKeyFallbackGate.js";
import { AgentStreamErrorMessageResolver } from "../../support/error/AgentStreamErrorMessageResolver.js";

export class AgentChatStreamSession {
  private readonly missingOpenAiApiKeyFallbackGate = new AgentMissingOpenAiApiKeyFallbackGate();
  private readonly streamErrorMessageResolver = new AgentStreamErrorMessageResolver();
  private readonly toolConversationAppender = new OpenAIToolConversationAppender();

  constructor(
    private readonly openAiApiKey: string,
    private readonly config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly contextPipeline: AgentContextPipeline,
    private readonly memoryTaskCompletionSubmitter: AgentMemoryTaskCompletionSubmitter,
    private readonly openAiClient: OpenAIChatClient,
    private readonly openAiToolFacade: AgentOpenAiToolFacade,
    private readonly toolExecutorFactory: AgentToolExecutorFactory
  ) {}

  async stream(chatRequest: ChatStreamRequest, turnId: string, writer: SseWriter): Promise<void> {
    const eventWriter = new AgentStreamEventWriter(writer);

    await writer.start();
    try {
      const modelMessages = await this.contextPipeline.build(chatRequest);
      const tools = await this.openAiToolFacade.listTools();
      const toolExecutor = this.toolExecutorFactory.create(chatRequest, tools);
      if (this.openAiApiKey && this.core.canStream()) {
        await this.streamWithRust(modelMessages, tools, chatRequest, eventWriter);
      } else {
        for await (const event of this.openAiClient.streamChatEvents(modelMessages, tools, toolExecutor)) {
          await eventWriter.write(event);
        }
      }

      if (this.missingOpenAiApiKeyFallbackGate.shouldWrite(this.openAiApiKey, eventWriter.emitted)) {
        await eventWriter.writeMissingOpenAiApiKeyFallback();
      }

      await writer.done("stream_finished");
      await this.memoryTaskCompletionSubmitter.submit(chatRequest, turnId, eventWriter.answer);
    } catch (error) {
      await writer.error("internal_error", this.streamErrorMessageResolver.resolve(error), true);
    }
  }

  private async streamWithRust(
    modelMessages: ChatStreamRequest["messages"],
    tools: Awaited<ReturnType<AgentOpenAiToolFacade["listTools"]>>,
    chatRequest: ChatStreamRequest,
    eventWriter: AgentStreamEventWriter
  ): Promise<void> {
    const conversation = modelMessages.map(({ role, content }) => ({ role, content }));
    const toolExecutor = this.toolExecutorFactory.create(chatRequest, tools);
    const toolCalls: OpenAIToolCall[] = [];

    for await (const event of this.streamRustRound(conversation, tools)) {
      if (event.type === "delta") {
        await eventWriter.write(event);
      } else if (event.type === "tool_call") {
        const toolCall = {
          id: event.tool_call_id,
          type: "function" as const,
          function: { name: event.tool_name, arguments: JSON.stringify(event.tool_args) }
        };
        toolCalls.push(toolCall);
        await eventWriter.write({
          type: "tool_call",
          toolCallId: event.tool_call_id,
          toolName: event.tool_name,
          toolArgs: event.tool_args
        });
      }
    }

    if (toolCalls.length === 0 || !toolExecutor) {
      return;
    }

    this.toolConversationAppender.appendAssistantToolCalls(conversation, toolCalls);
    for (const toolCall of toolCalls) {
      const toolArgs = OpenAIToolArgumentParser.parse(toolCall.function.arguments);
      const toolResult = await toolExecutor(toolCall.function.name, toolArgs);
      await eventWriter.write({
        type: "tool_result",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        toolOutput: toolResult.output,
        success: toolResult.success
      });
      this.toolConversationAppender.appendToolResult(conversation, toolCall, toolResult.output);
    }

    for await (const event of this.streamRustRound(conversation, [])) {
      if (event.type === "delta") {
        await eventWriter.write(event);
      }
    }
  }

  private streamRustRound(
    messages: Parameters<AgentCoreClient["streamChat"]>[0]["messages"],
    tools: Awaited<ReturnType<AgentOpenAiToolFacade["listTools"]>>
  ) {
    return this.core.streamChat({
      url: `${this.config.openAiBaseUrl}/chat/completions`,
      apiKey: this.config.openAiApiKey,
      model: this.config.openAiModel,
      temperature: this.config.openAiTemperature,
      requestTimeoutMs: this.config.requestTimeoutMs,
      messages,
      tools
    });
  }
}
