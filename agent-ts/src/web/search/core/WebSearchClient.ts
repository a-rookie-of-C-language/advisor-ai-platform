import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import type { WebSearchResult } from "../model/WebSearchResult.js";
import { TavilySearchHttpClient } from "../provider/tavily/http/TavilySearchHttpClient.js";
import { TavilySearchResultMapper } from "../provider/tavily/mapping/TavilySearchResultMapper.js";

export class WebSearchClient {
  private readonly httpClient: TavilySearchHttpClient;
  private readonly resultMapper = new TavilySearchResultMapper();

  constructor(private readonly config: AgentConfig) {
    this.httpClient = new TavilySearchHttpClient(config);
  }

  async search(query: string): Promise<WebSearchResult[]> {
    if (!this.config.webSearchApiKey || !query.trim()) {
      return [];
    }

    const payload = await this.httpClient.search(query);
    if (!payload) {
      return [];
    }
    return this.resultMapper.mapResults(payload);
  }
}
