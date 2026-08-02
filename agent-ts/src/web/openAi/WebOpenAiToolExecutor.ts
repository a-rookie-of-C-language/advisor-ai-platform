import type { JsonObject } from "../../common/json/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "../fetch/WebFetchClient.js";
import type { WebSearchClient } from "../search/WebSearchClient.js";
import { WebOpenAiToolDispatcher } from "./WebOpenAiToolDispatcher.js";

export class WebOpenAiToolExecutor {
  private readonly dispatcher: WebOpenAiToolDispatcher;

  constructor(
    webFetchClient?: WebFetchClient,
    webSearchClient?: WebSearchClient
  ) {
    this.dispatcher = new WebOpenAiToolDispatcher(webFetchClient, webSearchClient);
  }

  async execute(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    return this.dispatcher.dispatch(toolName, args);
  }
}
