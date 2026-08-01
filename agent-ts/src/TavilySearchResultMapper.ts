import type { TavilySearchResponse } from "./TavilySearchResponse.js";
import type { WebSearchResult } from "./WebSearchResult.js";

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
