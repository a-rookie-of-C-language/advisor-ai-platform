import type { ChatMessageDTO } from "../../../common/model/ChatMessageDTO.js";
import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import { PromptBuilder } from "../../../prompt/PromptBuilder.js";
import { FailureMemoryMatcher } from "./FailureMemoryMatcher.js";
import { FailureMemoryStore } from "./FailureMemoryStore.js";

export class FailureMemorySupport {
  private readonly matcher = new FailureMemoryMatcher();

  constructor(
    private readonly store: FailureMemoryStore,
    private readonly scoreThreshold: number
  ) {}

  injectAvoidancePrompt(messages: readonly ChatMessageDTO[], userQuery: string): ChatMessageDTO[] {
    if (!userQuery.trim()) return [...messages];
    let matched: ReturnType<FailureMemoryMatcher["match"]>;
    try {
      matched = this.matcher.match(userQuery, this.store.loadRecent());
    } catch {
      return [...messages];
    }
    if (!matched) return [...messages];
    const prompt = PromptBuilder.buildFailureAvoidPrompt({
      memory: {
        reasons: [...matched.item.reasons],
        avoid_strategy: matched.item.avoidStrategy
      }
    });
    if (!prompt) return [...messages];
    return PromptBuilder.assembleMessages(messages, { dynamicPrompts: [prompt] });
  }

  evaluateAndRecord(userQuery: string, traceEvents: readonly JsonObject[], sessionId?: string): void {
    const actionScore = this.scoreAction(userQuery, traceEvents);
    if (actionScore.reasons.length === 0 || actionScore.total >= this.scoreThreshold || !userQuery.trim()) return;
    try {
      this.store.append({
        timestamp: new Date().toISOString(),
        userQuery,
        sessionId,
        score: actionScore.total,
        reasons: [...new Set(actionScore.reasons)],
        avoidStrategy: "优先选择明确的工具，校验工具参数，并以工具证据支撑回答。"
      });
    } catch {
      // Failure memory is advisory; storage errors must not fail the chat stream.
    }
  }

  private scoreAction(userQuery: string, traceEvents: readonly JsonObject[]): { total: number; reasons: string[] } {
    const shouldCallTool = this.shouldCallTool(userQuery);
    const calledTool = this.calledTool(traceEvents);
    const reasons: string[] = [];

    if (shouldCallTool && !calledTool) {
      reasons.push("should_call_but_not_called");
      return { total: 70, reasons };
    }

    if (calledTool && this.hasToolMiss(traceEvents)) {
      reasons.push("tool_called_but_missed");
      return { total: 85, reasons };
    }

    return { total: 100, reasons };
  }

  private shouldCallTool(userQuery: string): boolean {
    const normalized = userQuery.toLowerCase();
    const terms = [
      "知识库",
      "来源",
      "资料",
      "文档",
      "检索",
      "搜索",
      "根据",
      "source",
      "sources",
      "knowledge base",
      "document",
      "search",
      "retrieve"
    ];
    return terms.some((term) => normalized.includes(term.toLowerCase()));
  }

  private calledTool(traceEvents: readonly JsonObject[]): boolean {
    const toolEvents = new Set(["sources", "tool_result", "tool_use", "tool_call"]);
    for (const event of traceEvents) {
      const eventName = String((event.event ?? event.type) || "");
      if (toolEvents.has(eventName)) {
        return true;
      }
    }
    return false;
  }

  private hasToolMiss(traceEvents: readonly JsonObject[]): boolean {
    for (const event of traceEvents) {
      const payload = (event.data ?? event.payload) as JsonObject | undefined;
      if (!payload || typeof payload !== "object") continue;
      if (payload.status === "miss") {
        return true;
      }
      const toolOutput = payload.tool_output;
      if (typeof toolOutput === "string") {
        try {
          const parsed = JSON.parse(toolOutput) as JsonObject;
          if (parsed.status === "miss") {
            return true;
          }
        } catch {
          // Ignore malformed tool output payloads.
        }
      }
    }
    return false;
  }
}
