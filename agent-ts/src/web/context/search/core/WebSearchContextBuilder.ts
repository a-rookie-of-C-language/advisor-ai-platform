import type { ChatMessageDTO, ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { WebSearchClient } from "../../../search/core/WebSearchClient.js";
import { WebSearchSystemMessageFactory } from "../factory/WebSearchSystemMessageFactory.js";
import { WebSearchQueryFinder } from "../query/WebSearchQueryFinder.js";
import { WebSearchResultRenderer } from "../rendering/WebSearchResultRenderer.js";

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
      return [this.systemMessageFactory.create(this.resultRenderer.render(results)), ...request.messages];
    } catch {
      return request.messages;
    }
  }
}
