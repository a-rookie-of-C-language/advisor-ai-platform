import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "../openai/chat/OpenAIChatTool.js";
import type { WebFetchClient } from "./fetch/WebFetchClient.js";
import { OpenAiToolResultFactory } from "../openai/tools/runtime/OpenAiToolResultFactory.js";
import { WebOpenAiToolBridgeComponents } from "./WebOpenAiToolBridgeComponents.js";
import { WebOpenAiToolBridgeComponentsFactory } from "./WebOpenAiToolBridgeComponentsFactory.js";
import type { WebSearchClient } from "./search/WebSearchClient.js";

export class WebOpenAiToolBridge {
  private readonly components: WebOpenAiToolBridgeComponents;
  private readonly componentsFactory = new WebOpenAiToolBridgeComponentsFactory();

  constructor(
    private readonly webFetchClient?: WebFetchClient,
    private readonly webSearchClient?: WebSearchClient
  ) {
    this.components = this.componentsFactory.create(webFetchClient, webSearchClient);
  }

  listTools(): OpenAIChatTool[] {
    return this.components.catalog.listTools(
      this.components.availabilityFactory.create(this.webFetchClient, this.webSearchClient)
    );
  }

  canExecute(toolName: string): boolean {
    return this.components.toolNameMatcher.matches(
      toolName,
      this.components.availabilityFactory.create(this.webFetchClient, this.webSearchClient)
    );
  }

  async executeTool(toolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    try {
      return await this.components.executor.execute(toolName, args);
    } catch (error) {
      return OpenAiToolResultFactory.errorFromUnknown(error, "web tool failed");
    }
  }
}
