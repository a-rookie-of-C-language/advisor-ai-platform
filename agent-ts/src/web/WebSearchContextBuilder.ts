import type { ChatMessageDTO, ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { WebSearchClient } from "./WebSearchClient.js";
import type { WebSearchResult } from "./WebSearchResult.js";

export class WebSearchContextBuilder {
  constructor(private readonly webSearchClient: WebSearchClient) {}

  async injectWebSearch(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const query = this.findSearchQuery(request.messages);
    if (!query) {
      return request.messages;
    }

    try {
      const results = await this.webSearchClient.search(query);
      if (results.length === 0) {
        return request.messages;
      }
      return [
        {
          role: "system",
          content: `Fresh web search context is available. Use it only when relevant and cite source URLs when using it.\n${this.renderResults(results)}`
        },
        ...request.messages
      ];
    } catch {
      return request.messages;
    }
  }

  private findSearchQuery(messages: ChatMessageDTO[]): string {
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

  private renderResults(results: WebSearchResult[]): string {
    return results
      .slice(0, 5)
      .map((result, index) => `${index + 1}. ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`)
      .join("\n\n");
  }
}
