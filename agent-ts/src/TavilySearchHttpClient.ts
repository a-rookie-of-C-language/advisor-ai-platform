import type { AgentConfig } from "./config/AgentConfig.js";
import type { TavilySearchResponse } from "./TavilySearchResponse.js";

export class TavilySearchHttpClient {
  constructor(private readonly config: AgentConfig) {}

  async search(query: string): Promise<TavilySearchResponse | null> {
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
        return null;
      }
      return (await response.json()) as TavilySearchResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}
