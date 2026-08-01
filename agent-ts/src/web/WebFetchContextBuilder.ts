import type { ChatMessageDTO, ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import { WebFetchedPageRenderer } from "./WebFetchedPageRenderer.js";
import { WebFetchSystemMessageFactory } from "./WebFetchSystemMessageFactory.js";
import { WebFetchUrlExtractor } from "./WebFetchUrlExtractor.js";

export class WebFetchContextBuilder {
  private readonly pageRenderer = new WebFetchedPageRenderer();
  private readonly systemMessageFactory = new WebFetchSystemMessageFactory();
  private readonly urlExtractor = new WebFetchUrlExtractor();

  constructor(private readonly webFetchClient: WebFetchClient) {}

  async injectWebFetch(request: ChatStreamRequest): Promise<ChatMessageDTO[]> {
    const urls = this.urlExtractor.extract(request.messages.at(-1)?.content || "");
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
        this.systemMessageFactory.create(this.pageRenderer.render(pages)),
        ...request.messages
      ];
    } catch {
      return request.messages;
    }
  }
}
