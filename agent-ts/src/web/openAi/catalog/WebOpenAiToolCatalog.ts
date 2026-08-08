import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import { WebFetchOpenAiToolDefinition } from "../../tools/definitions/fetch/WebFetchOpenAiToolDefinition.js";
import { WebSearchOpenAiToolDefinition } from "../../tools/definitions/search/WebSearchOpenAiToolDefinition.js";

export class WebOpenAiToolCatalog {
  private readonly fetchDefinition = new WebFetchOpenAiToolDefinition();
  private readonly searchDefinition = new WebSearchOpenAiToolDefinition();

  listTools(options: { webFetchEnabled: boolean; webSearchEnabled: boolean }): OpenAIChatTool[] {
    const tools: OpenAIChatTool[] = [];
    if (options.webFetchEnabled) {
      tools.push(this.fetchDefinition.create());
    }
    if (options.webSearchEnabled) {
      tools.push(this.searchDefinition.create());
    }
    return tools;
  }
}
