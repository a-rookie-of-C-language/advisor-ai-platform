import type { OpenAIChatTool } from "../../../../../openai/chat/model/tool/OpenAIChatTool.js";
import { WorkspaceOpenAiToolDefinitions } from "../definitions/WorkspaceOpenAiToolDefinitions.js";

export class WorkspaceOpenAiToolCatalog {
  private readonly definitions = new WorkspaceOpenAiToolDefinitions();

  listTools(): OpenAIChatTool[] {
    return this.definitions.list();
  }

  toolNames(): Set<string> {
    return new Set(this.listTools().map((tool) => tool.function.name));
  }
}
