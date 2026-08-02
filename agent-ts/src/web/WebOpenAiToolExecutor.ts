import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import { WebOpenAiToolDispatcher } from "./WebOpenAiToolDispatcher.js";
import type { WebSearchClient } from "./search/WebSearchClient.js";

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
