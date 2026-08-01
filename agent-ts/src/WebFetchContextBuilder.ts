import type { ChatMessageDTO, ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";
import type { WebFetchClient } from "./WebFetchClient.js";

export class WebFetchContextBuilder {
  constructor(private readonly webFetchClient: WebFetchClient) {}

  async injectWebFetch(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const urls = this.extractUrls(request.messages.at(-1)?.content || "");
    if (urls.length === 0) {
      return request.messages;
    }

    try {
      const pages = (await Promise.all(urls.slice(0, 3).map((url) => this.webFetchClient.fetchPage(url)))).filter(
        (page): page is WebFetchedPage => page !== null
      );
      if (pages.length === 0) {
        return request.messages;
      }
      return [
        {
          role: "system",
          content: `Fetched web context is available. Use it only when relevant and cite the page URL when using it.\n${this.renderPages(pages)}`
        },
        ...request.messages
      ];
    } catch {
      return request.messages;
    }
  }

  private extractUrls(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s)）]+/g) || [];
    return [...new Set(matches.map((url) => url.replace(/[.,，。!?！？]+$/, "")))];
  }

  private renderPages(pages: WebFetchedPage[]): string {
    return pages
      .map((page, index) => {
        const title = page.title ? `Title: ${page.title}\n` : "";
        return `${index + 1}. URL: ${page.url}\n${title}Content: ${page.content}`;
      })
      .join("\n\n");
  }
}
