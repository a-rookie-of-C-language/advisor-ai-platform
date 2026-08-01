import type { JsonObject } from "./common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "./openai/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./openai/OpenAIChatTool.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import { OpenAiToolResultFactory } from "./openai/OpenAiToolResultFactory.js";
import { WebOpenAiToolCatalog } from "./WebOpenAiToolCatalog.js";
import { WebOpenAiToolExecutor } from "./WebOpenAiToolExecutor.js";
import type { WebSearchClient } from "./WebSearchClient.js";

export class WebOpenAiToolBridge {
  private readonly catalog = new WebOpenAiToolCatalog();
  private readonly executor: WebOpenAiToolExecutor;

  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {
    this.executor = new WebOpenAiToolExecutor(webFetchClient, webSearchClient);
  }

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools({
      webFetchEnabled: Boolean(this.webFetchClient),
      webSearchEnabled: Boolean(this.webSearchClient)
    });
  }

  canExecute(toolName: string): boolean {
    return (toolName === "web_fetch" && Boolean(this.webFetchClient)) || (toolName === "web_search" && Boolean(this.webSearchClient));
  }

  async executeTool(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    try {
      return await this.executor.execute(toolName, args);
    } catch (error) {
      return OpenAiToolResultFactory.error(error instanceof Error ? error.message : "web tool failed");
    }
  }
}
