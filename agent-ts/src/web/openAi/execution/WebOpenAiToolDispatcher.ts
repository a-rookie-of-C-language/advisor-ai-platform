import type { JsonObject } from "../../../common/json/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../../../openai/tools/arguments/core/OpenAiToolArgumentReader.js";
import type { OpenAiToolExecutionResult } from "../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "../../fetch/WebFetchClient.js";
import type { WebSearchClient } from "../../search/WebSearchClient.js";
import { WebToolResultFactory } from "../result/WebToolResultFactory.js";

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
