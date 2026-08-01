import type { ChatMessageDTO } from "../common/ChatStreamRequest.js";

export class WebSearchQueryFinder {
  find(messages: ChatMessageDTO[]): string {
    const latestUserMessage = messages.filter((message) => message.role === "user").at(-1)?.content.trim() || "";
    if (!latestUserMessage || this.containsUrl(latestUserMessage)) {
      return "";
    }
    if (!this.looksLikeSearch(latestUserMessage)) {
      return "";
    }
    return latestUserMessage;
  }

  private containsUrl(text: string): boolean {
    return /https?:\/\//i.test(text);
  }

  private looksLikeSearch(text: string): boolean {
    return /最新|现在|今日|实时|新闻|搜索|查一下|找一下|latest|current|recent|news|search|find|lookup|price|pricing/i.test(text);
  }
}
