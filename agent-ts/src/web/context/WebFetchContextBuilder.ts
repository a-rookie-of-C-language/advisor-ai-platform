import type { ChatMessageDTO, ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { WebFetchClient } from "../fetch/core/WebFetchClient.js";
import { WebFetchedPageLoader } from "../fetch/loading/WebFetchedPageLoader.js";
import { WebFetchUrlExtractor } from "./fetch/extraction/WebFetchUrlExtractor.js";
import { WebFetchedPageRenderer } from "./WebFetchedPageRenderer.js";
import { WebFetchSystemMessageFactory } from "./WebFetchSystemMessageFactory.js";

export class WebFetchContextBuilder {
  private readonly pageLoader = new WebFetchedPageLoader();
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
      const pages = await this.pageLoader.load(this.webFetchClient, urls);
      if (pages.length === 0) {
        return request.messages;
      }
      return [this.systemMessageFactory.create(this.pageRenderer.render(pages)), ...request.messages];
    } catch {
      return request.messages;
    }
  }
}
