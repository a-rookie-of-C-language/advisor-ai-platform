import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import type { WebSearchClient } from "./WebSearchClient.js";
import { WebToolResultFactory } from "./WebToolResultFactory.js";

export class WebOpenAiToolDispatcher {
  private readonly resultFactory = new WebToolResultFactory();

  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {}

  async dispatch(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    if (toolName === "web_fetch" && this.webFetchClient) {
      const page = await this.webFetchClient.fetchPage(OpenAiToolArgumentReader.readRequiredString(args, "url"));
      return this.resultFactory.createFetchResult(page);
    }
    if (toolName === "web_search" && this.webSearchClient) {
      const results = await this.webSearchClient.search(OpenAiToolArgumentReader.readRequiredString(args, "query"));
      return this.resultFactory.createSearchResult(results);
    }
    throw new Error(`未知 web 工具: ${toolName}`);
  }
}
