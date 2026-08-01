import type { AgentConfig } from "./AgentConfig.js";
import type { TavilySearchResponse } from "./TavilySearchResponse.js";
import { TavilySearchResultMapper } from "./TavilySearchResultMapper.js";
import type { WebSearchResult } from "./WebSearchResult.js";

export class WebSearchClient {
  private readonly resultMapper = new TavilySearchResultMapper();

  constructor(private readonly config: AgentConfig) {}

  async search(query: string): Promise<WebSearchResult[]> {
    if (!this.config.webSearchApiKey || !query.trim()) {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.config.requestTimeoutMs, 8_000));
    try {
      const response = await fetch(this.config.webSearchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: this.config.webSearchApiKey,
          query,
          max_results: this.config.webSearchMaxResults
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        return [];
      }
      const payload = (await response.json()) as TavilySearchResponse;
      return this.resultMapper.mapResults(payload);
    } finally {
      clearTimeout(timeout);
    }
  }
}
