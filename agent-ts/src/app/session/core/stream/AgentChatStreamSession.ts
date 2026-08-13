import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { AgentConfig } from "../../../../config/model/core/AgentConfig.js";
import type { AgentCoreClient } from "../../../../core/client/AgentCoreClient.js";
import type { OpenAIChatClient } from "../../../../openai/chat/core/client/OpenAIChatClient.js";
import { AgentStreamEventWriter } from "../../../../protocol/events/stream/writer/AgentStreamEventWriter.js";
import type { SseWriter } from "../../../../protocol/sse/writer/SseWriter.js";
import { AgentLoopFactory } from "../../../loop/factory/AgentLoopFactory.js";
import type { AgentMemoryTaskCompletionSubmitter } from "../../../memory/execution/AgentMemoryTaskCompletionSubmitter.js";
import type { AgentOpenAiToolFacade } from "../../../openAi/core/AgentOpenAiToolFacade.js";
import type { AgentContextPipeline } from "../pipeline/AgentContextPipeline.js";
import { AgentMissingOpenAiApiKeyFallbackGate } from "../../support/fallback/AgentMissingOpenAiApiKeyFallbackGate.js";
import { AgentStreamErrorMessageResolver } from "../../support/error/AgentStreamErrorMessageResolver.js";

export class AgentChatStreamSession {
  private readonly missingOpenAiApiKeyFallbackGate = new AgentMissingOpenAiApiKeyFallbackGate();
  private readonly streamErrorMessageResolver = new AgentStreamErrorMessageResolver();

  constructor(
    private readonly openAiApiKey: string,
    private readonly config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly contextPipeline: AgentContextPipeline,
    private readonly memoryTaskCompletionSubmitter: AgentMemoryTaskCompletionSubmitter,
    private readonly openAiClient: OpenAIChatClient,
    private readonly openAiToolFacade: AgentOpenAiToolFacade
  ) {}

  async stream(chatRequest: ChatStreamRequest, turnId: string, writer: SseWriter): Promise<void> {
    await writer.start();
    try {
      const eventWriter = new AgentStreamEventWriter(writer);
      const modelMessages = await this.contextPipeline.build(chatRequest);
      await this.openAiToolFacade.listTools();
      const loop = new AgentLoopFactory(
        this.config,
        this.core,
        this.openAiClient,
        this.openAiToolFacade,
        this.contextPipeline
      ).create(
        { ...chatRequest, messages: modelMessages },
        { maxTurns: 3, signal: writer.signal, writer: (event) => eventWriter.write(event) }
      );
      const loopResult = await loop.run();
      if (this.missingOpenAiApiKeyFallbackGate.shouldWrite(this.openAiApiKey, loopResult.emitted)) {
        await eventWriter.writeMissingOpenAiApiKeyFallback();
      }
      await writer.done("stream_finished");
      await this.memoryTaskCompletionSubmitter.submit(chatRequest, turnId, loopResult.answer);
    } catch (error) {
      if (writer.signal?.aborted) {
        return;
      }
      await writer.error("internal_error", this.streamErrorMessageResolver.resolve(error), true);
    }
  }
}
