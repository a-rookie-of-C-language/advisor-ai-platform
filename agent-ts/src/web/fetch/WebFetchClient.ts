import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { WebFetchedPage } from "./model/WebFetchedPage.js";
import { WebFetchedPageBuilder } from "./WebFetchedPageBuilder.js";
import { WebPageHttpClient } from "./WebPageHttpClient.js";

export class WebFetchClient {
  private readonly pageBuilder = new WebFetchedPageBuilder();
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
    return this.pageBuilder.build(url, html, this.config.webFetchMaxContentLength);
  }
}
