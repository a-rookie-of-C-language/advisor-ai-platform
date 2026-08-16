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
import { InputSafetySanitizer } from "../../../../safety/input/InputSafetySanitizer.js";
import { ContextCompactionService } from "../../../../context/compaction/core/ContextCompactionService.js";
import { LatestUserQueryResolver } from "../../../../common/request/resolver/LatestUserQueryResolver.js";
import { IntentRouter } from "../../../../routing/core/IntentRouter.js";
import { TaskPlanner } from "../../../../planning/core/TaskPlanner.js";
import { ToolExplorer } from "../../../../tools/explorer/core/ToolExplorer.js";
import { FailureMemoryStore } from "../../../../memory/failure/core/FailureMemoryStore.js";
import { FailureMemorySupport } from "../../../../memory/failure/core/FailureMemorySupport.js";
import type { AgentLoopEvent } from "../../../loop/model/AgentLoopOptions.js";

export class AgentChatStreamSession {
  private readonly missingOpenAiApiKeyFallbackGate = new AgentMissingOpenAiApiKeyFallbackGate();
  private readonly streamErrorMessageResolver = new AgentStreamErrorMessageResolver();
  private readonly inputSafetySanitizer = new InputSafetySanitizer();
  private readonly latestUserQueryResolver = new LatestUserQueryResolver();
  private readonly intentRouter = new IntentRouter();
  private readonly taskPlanner = new TaskPlanner();
  private readonly toolExplorer = new ToolExplorer();
  private readonly failureMemorySupport: FailureMemorySupport;
  private readonly contextCompactionService: ContextCompactionService;

  constructor(
    private readonly openAiApiKey: string,
    private readonly config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly contextPipeline: AgentContextPipeline,
    private readonly memoryTaskCompletionSubmitter: AgentMemoryTaskCompletionSubmitter,
    private readonly openAiClient: OpenAIChatClient,
    private readonly openAiToolFacade: AgentOpenAiToolFacade
  ) {
    this.contextCompactionService = new ContextCompactionService(
      config.contextWindowTokens,
      config.contextReserveTokens,
      config.contextKeepLastMessages
    );
    this.failureMemorySupport = new FailureMemorySupport(
      new FailureMemoryStore(config.failureMemoryPath),
      config.failureMemoryScoreThreshold
    );
  }

  async stream(chatRequest: ChatStreamRequest, turnId: string, writer: SseWriter): Promise<void> {
    const traceEvents: AgentLoopEvent[] = [];
    let failureQuery = "";
    await writer.start();
    try {
      const eventWriter = new AgentStreamEventWriter(writer);
      const safeChatRequest = this.inputSafetySanitizer.sanitize(chatRequest);
      failureQuery = this.latestUserQueryResolver.resolve(safeChatRequest);
      const failureAwareChatRequest = {
        ...safeChatRequest,
        messages: this.failureMemorySupport.injectAvoidancePrompt(safeChatRequest.messages, failureQuery)
      };
      const route = this.intentRouter.route(failureQuery, [
        "retrieval",
        "search",
        "memory_read",
        "memory_write",
        "skill",
        "student"
      ]);
      const contextMessages = await this.contextPipeline.build(failureAwareChatRequest, route);
      const modelMessages = this.contextCompactionService.compact(contextMessages).messages;
      const availableTools = await this.openAiToolFacade.listTools();
      const exploration = this.toolExplorer.explore(
        this.latestUserQueryResolver.resolve(safeChatRequest),
        availableTools,
        route.categories
      );
      const taskPlan = this.taskPlanner.plan({
        userQuery: this.latestUserQueryResolver.resolve(safeChatRequest),
        availableTools,
        routeCategories: [...route.categories],
        matchedTools: exploration.matchedTools
      });
      const loop = new AgentLoopFactory(
        this.config,
        this.core,
        this.openAiClient,
        this.openAiToolFacade,
        this.contextPipeline
      ).create(
        { ...safeChatRequest, messages: modelMessages },
        {
          maxTurns: 3,
          signal: writer.signal,
          writer: (event) => eventWriter.write(event),
          onEvent: (event) => { traceEvents.push(event); },
          transformContext: (messages, signal) => this.contextPipeline.transform(messages, signal, route),
          toolPlan: taskPlan
        }
      );
      const loopResult = await loop.run();
      this.failureMemorySupport.evaluateAndRecord(failureQuery, traceEvents, turnId);
      await eventWriter.flushSafetyFilter();
      if (this.missingOpenAiApiKeyFallbackGate.shouldWrite(this.openAiApiKey, loopResult.emitted)) {
        await eventWriter.writeMissingOpenAiApiKeyFallback();
      }
      await writer.done("stream_finished");
      await this.memoryTaskCompletionSubmitter.submit(chatRequest, turnId, loopResult.answer);
    } catch (error) {
      this.failureMemorySupport.evaluateAndRecord(failureQuery, traceEvents, turnId);
      if (writer.signal?.aborted) {
        return;
      }
      await writer.error("internal_error", this.streamErrorMessageResolver.resolve(error), true);
    }
  }
}
