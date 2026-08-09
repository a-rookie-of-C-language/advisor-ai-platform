import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import { RagSearchOpenAiToolDefinition } from "../../tools/RagSearchOpenAiToolDefinition.js";

export class RagOpenAiToolCatalog {
  private readonly searchDefinition = new RagSearchOpenAiToolDefinition();

  listTools(): OpenAIChatTool[] {
    return [this.searchDefinition.create()];
  }

  toolNames(): Set<string> {
    return new Set(this.listTools().map((tool) => tool.function.name));
  }
}
