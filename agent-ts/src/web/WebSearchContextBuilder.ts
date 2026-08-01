import type { ChatMessageDTO, ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { WebSearchClient } from "./WebSearchClient.js";
import { WebSearchQueryFinder } from "./WebSearchQueryFinder.js";
import { WebSearchResultRenderer } from "./WebSearchResultRenderer.js";
import { WebSearchSystemMessageFactory } from "./WebSearchSystemMessageFactory.js";

export class WebSearchContextBuilder {
  private readonly queryFinder = new WebSearchQueryFinder();
  private readonly resultRenderer = new WebSearchResultRenderer();
  private readonly systemMessageFactory = new WebSearchSystemMessageFactory();

  constructor(private readonly webSearchClient: WebSearchClient) {}

  async injectWebSearch(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const query = this.queryFinder.find(request.messages);
    if (!query) {
      return request.messages;
    }

    try {
      const results = await this.webSearchClient.search(query);
      if (results.length === 0) {
        return request.messages;
      }
      return [
        this.systemMessageFactory.create(this.resultRenderer.render(results)),
        ...request.messages
      ];
    } catch {
      return request.messages;
    }
  }
}
