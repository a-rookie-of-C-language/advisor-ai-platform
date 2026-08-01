import type { AgentConfig } from "./AgentConfig.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";
import { WebHtmlParser } from "./WebHtmlParser.js";
import { WebPageHttpClient } from "./WebPageHttpClient.js";

export class WebFetchClient {
  private readonly htmlParser = new WebHtmlParser();
  private readonly pageHttpClient: WebPageHttpClient;

  constructor(private readonly config: AgentConfig) {
    this.pageHttpClient = new WebPageHttpClient(config);
  }

  async fetchPage(url: string): Promise<WebFetchedPage | null> {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    const html = await this.pageHttpClient.fetchHtml(parsedUrl);
    if (!html) {
      return null;
    }
    const title = this.htmlParser.extractTitle(html);
    const content = this.htmlParser.extractText(html).slice(0, this.config.webFetchMaxContentLength);
    if (!content.trim()) {
      return null;
    }
    return {
      url,
      title,
      content,
      source: "web"
    };
  }
}
