import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../openai/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "../openai/OpenAIChatTool.js";
import type { WebFetchClient } from "./WebFetchClient.js";
import { OpenAiToolResultFactory } from "../openai/OpenAiToolResultFactory.js";
import { WebOpenAiToolCatalog } from "./WebOpenAiToolCatalog.js";
import { WebOpenAiToolExecutor } from "./WebOpenAiToolExecutor.js";
import type { WebSearchClient } from "./WebSearchClient.js";
import { WebToolAvailabilityFactory } from "./WebToolAvailabilityFactory.js";
import { WebToolNameMatcher } from "./WebToolNameMatcher.js";

export class WebOpenAiToolBridge {
  private readonly availabilityFactory = new WebToolAvailabilityFactory();
  private readonly catalog = new WebOpenAiToolCatalog();
  private readonly executor: WebOpenAiToolExecutor;
  private readonly toolNameMatcher = new WebToolNameMatcher();

  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {
    this.executor = new WebOpenAiToolExecutor(webFetchClient, webSearchClient);
  }

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools(this.availabilityFactory.create(this.webFetchClient, this.webSearchClient));
  }

  canExecute(toolName: string): boolean {
    return this.toolNameMatcher.matches(toolName, this.availabilityFactory.create(this.webFetchClient, this.webSearchClient));
  }

  async executeTool(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    try {
      return await this.executor.execute(toolName, args);
    } catch (error) {
      return OpenAiToolResultFactory.errorFromUnknown(error, "web tool failed");
    }
  }
}
