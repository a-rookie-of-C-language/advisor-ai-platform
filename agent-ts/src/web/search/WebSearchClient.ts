import type { AgentConfig } from "../../config/model/AgentConfig.js";
import { TavilySearchHttpClient } from "./TavilySearchHttpClient.js";
import { TavilySearchResultMapper } from "./TavilySearchResultMapper.js";
import type { WebSearchResult } from "./model/WebSearchResult.js";

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
