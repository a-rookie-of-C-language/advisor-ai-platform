import type { OpenAIChatTool } from "../openai/OpenAIChatTool.js";
import { MemoryOpenAiToolDefinitions } from "./MemoryOpenAiToolDefinitions.js";

export class MemoryOpenAiToolCatalog {
  private readonly definitions = new MemoryOpenAiToolDefinitions();

  listTools(): OpenAIChatTool[] {
    return this.definitions.list();
  }

  toolNames(): Set<string> {
    return new Set(this.listTools().map((tool) => tool.function.name));
  }
}
