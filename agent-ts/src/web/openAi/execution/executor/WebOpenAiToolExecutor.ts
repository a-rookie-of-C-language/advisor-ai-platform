import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../../../../openai/tools/runtime/model/result/OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "../../../fetch/core/WebFetchClient.js";
import type { WebSearchClient } from "../../../search/core/WebSearchClient.js";
import { WebOpenAiToolDispatcher } from "../dispatcher/WebOpenAiToolDispatcher.js";

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
