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
import type { SkillRegistry } from "../../../../skills/core/SkillRegistry.js";
import { AgentMissingOpenAiApiKeyFallbackGate } from "../../support/fallback/AgentMissingOpenAiApiKeyFallbackGate.js";
import { AgentStreamErrorMessageResolver } from "../../support/error/AgentStreamErrorMessageResolver.js";
import { InputSafetySanitizer } from "../../../../safety/input/InputSafetySanitizer.js";
import { ContextCompactionService } from "../../../../context/compaction/core/ContextCompactionService.js";
import { LatestUserQueryResolver } from "../../../../common/request/resolver/LatestUserQueryResolver.js";
import { IntentRouter } from "../../../../routing/core/IntentRouter.js";
import { TaskPlanner } from "../../../../planning/core/TaskPlanner.js";
import { ToolExplorer } from "../../../../tools/explorer/core/ToolExplorer.js";
import { PromptBuilder } from "../../../../prompt/PromptBuilder.js";
import { FailureMemoryStore } from "../../../../memory/failure/core/FailureMemoryStore.js";
import { FailureMemorySupport } from "../../../../memory/failure/core/FailureMemorySupport.js";
import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { AgentLoopEvent } from "../../../loop/model/AgentLoopOptions.js";
import {
  adjustRoutePayload,
  buildLegacyRouteContext,
  buildPlannerRouteContext,
  preferRetrievalFallback
} from "../../../../legacy/core/LegacyRouteSupport.js";
import {
  buildDelegateReasoningPayload,
  buildPlanReasoningPayload,
  buildRouteReasoningPayload,
  shouldEmitPlanningReasoning
} from "../../../../legacy/core/LegacyReasoning.js";
import { executeLegacyForceFetch, resolveForceFetchUrl } from "../../../../legacy/core/LegacyForceFetch.js";
import { preferRagOnly, shouldForceEducationRag } from "../../../../graph/helpers.js";
import { buildExplorerContext } from "../../../../graph/helpers.js";
import { AgentGraphRunner } from "../../../../graph/core/AgentGraphRunner.js";
import type { GraphState } from "../../../../graph/model/GraphState.js";

export class AgentChatStreamSession {
  private readonly missingOpenAiApiKeyFallbackGate = new AgentMissingOpenAiApiKeyFallbackGate();
  private readonly streamErrorMessageResolver = new AgentStreamErrorMessageResolver();
  private readonly inputSafetySanitizer = new InputSafetySanitizer();
  private readonly latestUserQueryResolver = new LatestUserQueryResolver();
  private readonly intentRouter = new IntentRouter();
  private readonly taskPlanner: TaskPlanner;
  private readonly toolExplorer = new ToolExplorer();
  private readonly graphRunner: AgentGraphRunner;
  private readonly failureMemorySupport: FailureMemorySupport;
  private readonly contextCompactionService: ContextCompactionService;

  constructor(
    private readonly openAiApiKey: string,
    private readonly config: AgentConfig,
    private readonly core: AgentCoreClient,
    private readonly contextPipeline: AgentContextPipeline,
    private readonly memoryTaskCompletionSubmitter: AgentMemoryTaskCompletionSubmitter,
    private readonly openAiClient: OpenAIChatClient,
    private readonly openAiToolFacade: AgentOpenAiToolFacade,
    private readonly skillRegistry?: SkillRegistry
  ) {
    this.contextCompactionService = new ContextCompactionService(
      config.contextWindowTokens,
      config.contextReserveTokens,
      config.contextKeepLastMessages
    );
    this.failureMemorySupport = new FailureMemorySupport(
      new FailureMemoryStore(config.failureMemoryPath || ".agent-data/failure-memory.jsonl"),
      config.failureMemoryScoreThreshold ?? 7
    );
    this.taskPlanner = new TaskPlanner(config, openAiClient);
    this.graphRunner = new AgentGraphRunner(
      {},
      skillRegistry,
      skillRegistry
        ? async (prompt) => {
            const messages = [{ role: "user" as const, content: prompt }];
            let responseText = "";
            for await (const delta of this.openAiClient.streamChat(messages, undefined)) {
              responseText += delta;
            }
            return responseText;
          }
        : undefined
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
      const educationDomain = shouldForceEducationRag(failureQuery);
      const ragOnlyPreferred = preferRagOnly(failureQuery);
      const rawRoute = this.intentRouter.route(failureQuery, [
        "retrieval",
        "search",
        "memory_read",
        "memory_write",
        "skill",
        "student"
      ]);
      const availableTools = await this.openAiToolFacade.listTools();
      const route = preferRetrievalFallback(rawRoute, availableTools.some((tool) => tool.function.name === "rag_search"));
      const graphState: GraphState = {
        messages: failureAwareChatRequest.messages,
        userQuery: failureQuery,
        traceId: chatRequest.traceId ?? null,
        turnId
      };
      const selectedSkillState = this.skillRegistry
        ? await this.graphRunner.run(graphState)
        : graphState;
      const contextMessages = await this.contextPipeline.build(failureAwareChatRequest, route);
      const legacyRoute = buildLegacyRouteContext(route, route.matchedTools, educationDomain);
      let modelMessages = this.contextCompactionService.compact(
        PromptBuilder.assembleMessages(contextMessages, {
          skillPrompts: selectedSkillState.skillSystemPrompt ? [selectedSkillState.skillSystemPrompt] : []
        })
      ).messages;
      const taskPlan = await this.taskPlanner.planAsync({
        userQuery: this.latestUserQueryResolver.resolve(safeChatRequest),
        availableTools,
        routeContext: buildPlannerRouteContext(route, legacyRoute.matchedTools, educationDomain || ragOnlyPreferred)
      });
      const exploration = this.toolExplorer.explore(
        this.latestUserQueryResolver.resolve(safeChatRequest),
        availableTools,
        route.categories,
        taskPlan as unknown as JsonObject,
        [],
        safeChatRequest.messages
      );
      const exploredRoute = buildLegacyRouteContext(route, exploration.matchedTools, educationDomain);
      const routePayload = adjustRoutePayload(
        route.toEventPayload() as JsonObject,
        route,
        exploredRoute.matchedTools,
        route.matchedTools
      );
      await writer.write("intent_route", "system", routePayload);
      const shouldEmitReasoning = shouldEmitPlanningReasoning(educationDomain, exploration.reason !== "none");
      if (exploration.reason !== "none") {
        await writer.write("sys_reasoning", "system", buildDelegateReasoningPayload("tool_explorer_subagent"));
      }
      if (shouldEmitReasoning) {
        await writer.write("sys_reasoning", "system", buildRouteReasoningPayload([...exploredRoute.categories], exploredRoute.matchedTools, exploredRoute.educationDomain));
      }
      if (exploration.reason !== "none") {
        const explorerEvidence = exploration.evidence.map((item) => ({
          tool_name: item.tool_name,
          status: item.status,
          message: item.message,
          items: [...item.items]
        })) as JsonObject[];
        const explorerToolCalls = exploration.toolCalls.map((item) => ({ ...item })) as JsonObject[];
        modelMessages = PromptBuilder.assembleMessages(modelMessages, {
          dynamicPrompts: [buildExplorerContext({
            summary: exploration.summary,
            evidence: explorerEvidence,
            toolCalls: explorerToolCalls
          })]
        });
      }
      if (shouldEmitReasoning) {
        await writer.write("sys_reasoning", "system", buildDelegateReasoningPayload("task_planner_subagent"));
        await writer.write("sys_tool_plan", "system", taskPlan as unknown as JsonObject);
        await writer.write("sys_reasoning", "system", buildPlanReasoningPayload(taskPlan as unknown as JsonObject));
      }
      const forceFetchUrl = resolveForceFetchUrl(exploredRoute.matchedTools, failureQuery);
      if (forceFetchUrl) {
        const fetchResult = await executeLegacyForceFetch(forceFetchUrl, async (toolName, args) => {
          const result = await this.openAiToolFacade.executeTool(safeChatRequest, toolName, args, writer.signal);
          return { output: result.output, success: result.success };
        });
        await writer.write("tool_use", "tool", {
          tool_name: "web_fetch",
          tool_call_id: "web_fetch-1",
          input: { url: forceFetchUrl, max_content_length: 4000 }
        });
        for (const event of fetchResult.events) {
          if (event.event === "tool_use") continue;
          const eventName = String(event.event);
          await writer.write(eventName, "tool", {
            tool_name: "web_fetch",
            tool_call_id: "web_fetch-1",
            payload: event.payload
          });
        }
        if (fetchResult.contextPrompt) {
          modelMessages = PromptBuilder.assembleMessages(modelMessages, {
            dynamicPrompts: [fetchResult.contextPrompt]
          });
        }
        for await (const event of this.openAiClient.streamChatEvents(modelMessages, [], undefined, writer.signal)) {
          await eventWriter.write(event);
        }
        this.failureMemorySupport.evaluateAndRecord(failureQuery, traceEvents, turnId);
        await eventWriter.flushSafetyFilter();
        if (this.missingOpenAiApiKeyFallbackGate.shouldWrite(this.openAiApiKey, eventWriter.emitted)) {
          await eventWriter.writeMissingOpenAiApiKeyFallback();
        }
        await writer.done("stream_finished");
        await this.memoryTaskCompletionSubmitter.submit(chatRequest, turnId, eventWriter.answer);
        return;
      }
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
