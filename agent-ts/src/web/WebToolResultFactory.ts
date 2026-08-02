import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";
import type { WebSearchResult } from "./search/WebSearchResult.js";

export class WebToolResultFactory {
  createFetchResult(page: WebFetchedPage | null): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({
        ok: Boolean(page),
        status: page ? "hit" : "miss",
        items: page ? [{ ...page }] : []
      }),
      success: Boolean(page)
    };
  }

  createSearchResult(results: WebSearchResult[]): OpenAiToolExecutionResult {
    return {
      output: JSON.stringify({
        ok: results.length > 0,
        status: results.length > 0 ? "hit" : "miss",
        items: results.map((result) => ({ ...result }))
      }),
      success: results.length > 0
    };
  }
}
