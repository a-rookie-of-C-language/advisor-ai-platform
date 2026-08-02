import type { ChatMessageDTO } from "../../common/ChatStreamRequest.js";
import { WebSearchTriggerMatcher } from "./WebSearchTriggerMatcher.js";

export class WebSearchQueryFinder {
  private readonly triggerMatcher = new WebSearchTriggerMatcher();

  find(messages: ChatMessageDTO[]): string {
    const latestUserMessage = messages.filter((message) => message.role === "user").at(-1)?.content.trim() || "";
    if (!this.triggerMatcher.matches(latestUserMessage)) {
      return "";
    }
    return latestUserMessage;
  }
}
