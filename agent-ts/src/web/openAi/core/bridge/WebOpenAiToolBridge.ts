import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { OpenAIChatTool } from "../../../../openai/chat/model/tool/OpenAIChatTool.js";
import { OpenAiToolResultFactory } from "../../../../openai/tools/runtime/factory/OpenAiToolResultFactory.js";
import type { OpenAiToolExecutionResult } from "../../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import type { WebFetchClient } from "../../../fetch/core/WebFetchClient.js";
import type { WebSearchClient } from "../../../search/core/WebSearchClient.js";
import { WebOpenAiToolBridgeComponentsFactory } from "../../factory/WebOpenAiToolBridgeComponentsFactory.js";
import { WebOpenAiToolBridgeComponents } from "../components/WebOpenAiToolBridgeComponents.js";

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
