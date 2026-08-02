import type { WebSearchResult } from "./model/WebSearchResult.js";
import type { TavilySearchResponse } from "./provider/tavily/model/TavilySearchResponse.js";

export class TavilySearchResultMapper {
  mapResults(payload: TavilySearchResponse): WebSearchResult[] {
    return (payload.results || []).map((item) => ({
      title: item.title || "",
      snippet: (item.content || "").slice(0, 300),
      url: item.url || "",
      source: "web"
    }));
  }
}
