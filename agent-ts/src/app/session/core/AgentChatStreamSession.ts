import type { ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";
import type { OpenAIChatClient } from "../../../openai/chat/core/client/OpenAIChatClient.js";
import { AgentStreamEventWriter } from "../../../protocol/events/stream/writer/AgentStreamEventWriter.js";
import type { SseWriter } from "../../../protocol/sse/writer/SseWriter.js";
import type { AgentMemoryTaskCompletionSubmitter } from "../../memory/execution/AgentMemoryTaskCompletionSubmitter.js";
import type { AgentOpenAiToolFacade } from "../../openAi/core/AgentOpenAiToolFacade.js";
import type { AgentToolExecutorFactory } from "../../openAi/factory/executor/AgentToolExecutorFactory.js";
import type { AgentContextPipeline } from "./AgentContextPipeline.js";
import { AgentMissingOpenAiApiKeyFallbackGate } from "../support/fallback/AgentMissingOpenAiApiKeyFallbackGate.js";
import { AgentStreamErrorMessageResolver } from "../support/error/AgentStreamErrorMessageResolver.js";

export class AgentChatStreamSession {
  private readonly missingOpenAiApiKeyFallbackGate = new AgentMissingOpenAiApiKeyFallbackGate();
  private readonly streamErrorMessageResolver = new AgentStreamErrorMessageResolver();

  constructor(
    private readonly openAiApiKey: string,
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
      for await (const event of this.openAiClient.streamChatEvents(modelMessages, tools, toolExecutor)) {
        await eventWriter.write(event);
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
}
