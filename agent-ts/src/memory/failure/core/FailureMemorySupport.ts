import type { ChatMessageDTO } from "../../../common/model/ChatMessageDTO.js";
import type { AgentLoopEvent } from "../../../app/loop/model/AgentLoopOptions.js";
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
    const matched = this.matcher.match(userQuery, this.store.loadRecent());
    if (!matched) return [...messages];
    return [{
      role: "system",
      content: `历史失败经验（相似度 ${matched.similarity}）：${matched.item.avoidStrategy}`
    }, ...messages];
  }

  evaluateAndRecord(userQuery: string, events: readonly AgentLoopEvent[], sessionId?: string): void {
    const reasons: string[] = [];
    let score = 10;
    for (const event of events) {
      if (event.type === "provider_request_end" && event.status === "error") {
        score -= 4;
        reasons.push(event.errorCode ? `provider_error:${event.errorCode}` : "provider_error");
      }
      if (event.type === "provider_request_end" && event.status === "aborted") {
        score -= 2;
        reasons.push("provider_aborted");
      }
      if (event.type === "tool_execution_end" && !event.success) {
        score -= 2;
        reasons.push(`tool_failed:${event.toolName}`);
      }
    }
    if (reasons.length === 0 || score >= this.scoreThreshold || !userQuery.trim()) return;
    this.store.append({
      timestamp: new Date().toISOString(),
      userQuery,
      sessionId,
      score,
      reasons: [...new Set(reasons)],
      avoidStrategy: "优先选择明确的工具，校验工具参数，并以工具证据支撑回答。"
    });
  }
}
