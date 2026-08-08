import type { OpenAIChatTool } from "../../../../../openai/chat/model/tool/OpenAIChatTool.js";
import { MemoryOpenAiToolDefinitions } from "../definitions/MemoryOpenAiToolDefinitions.js";

export class MemoryOpenAiToolCatalog {
  private readonly definitions = new MemoryOpenAiToolDefinitions();

  listTools(): OpenAIChatTool[] {
    return this.definitions.list();
  }

  toolNames(): Set<string> {
    return new Set(this.listTools().map((tool) => tool.function.name));
  }
}
