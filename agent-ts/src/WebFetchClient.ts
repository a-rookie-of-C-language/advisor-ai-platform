import type { AgentConfig } from "./AgentConfig.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";
import { WebHtmlParser } from "./WebHtmlParser.js";

export class WebFetchClient {
  private readonly htmlParser = new WebHtmlParser();

  constructor(private readonly config: AgentConfig) {}

  async fetchPage(url: string): Promise<WebFetchedPage | null> {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.config.requestTimeoutMs, 10_000));
    try {
      const response = await fetch(parsedUrl, {
        headers: {
          "User-Agent": "advisor-ai-agent-ts/0.1"
        },
        signal: controller.signal
      });
      if (!response.ok) {
        return null;
      }
      const html = await response.text();
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
    } finally {
      clearTimeout(timeout);
    }
  }
}
