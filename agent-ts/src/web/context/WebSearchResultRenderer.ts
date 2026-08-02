import type { WebSearchResult } from "../search/model/WebSearchResult.js";

export class WebSearchResultRenderer {
  render(results: WebSearchResult[]): string {
    return results
      .slice(0, 5)
      .map((result, index) => `${index + 1}. ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`)
      .join("\n\n");
  }
}
