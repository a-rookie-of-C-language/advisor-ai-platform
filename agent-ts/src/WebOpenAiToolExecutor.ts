import type { JsonObject } from "./common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import type { WebSearchClient } from "./WebSearchClient.js";

export class WebOpenAiToolExecutor {
  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {}

  async execute(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    if (toolName === "web_fetch" && this.webFetchClient) {
      const page = await this.webFetchClient.fetchPage(OpenAiToolArgumentReader.readRequiredString(args, "url"));
      return {
        output: JSON.stringify({
          ok: Boolean(page),
          status: page ? "hit" : "miss",
          items: page ? [{ ...page }] : []
        }),
        success: Boolean(page)
      };
    }
    if (toolName === "web_search" && this.webSearchClient) {
      const results = await this.webSearchClient.search(OpenAiToolArgumentReader.readRequiredString(args, "query"));
      return {
        output: JSON.stringify({
          ok: results.length > 0,
          status: results.length > 0 ? "hit" : "miss",
          items: results.map((result) => ({ ...result }))
        }),
        success: results.length > 0
      };
    }
    throw new Error(`未知 web 工具: ${toolName}`);
  }
}
