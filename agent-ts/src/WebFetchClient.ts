import type { AgentConfig } from "./AgentConfig.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";

export class WebFetchClient {
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
      const title = this.extractTitle(html);
      const content = this.extractText(html).slice(0, this.config.webFetchMaxContentLength);
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

  private extractTitle(html: string): string {
    return this.decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "");
  }

  private extractText(html: string): string {
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return this.decodeHtml(stripped);
  }

  private decodeHtml(text: string): string {
    return text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'");
  }
}
