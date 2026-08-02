import type { OpenAIChatTool } from "../../openai/chat/OpenAIChatTool.js";
import { WorkspaceCreateDirOpenAiToolDefinition } from "./WorkspaceCreateDirOpenAiToolDefinition.js";
import { WorkspaceEditOpenAiToolDefinition } from "./WorkspaceEditOpenAiToolDefinition.js";
import { WorkspaceListOpenAiToolDefinition } from "./WorkspaceListOpenAiToolDefinition.js";
import { WorkspaceReadOpenAiToolDefinition } from "./WorkspaceReadOpenAiToolDefinition.js";
import { WorkspaceWriteOpenAiToolDefinition } from "./WorkspaceWriteOpenAiToolDefinition.js";

export class WorkspaceOpenAiToolDefinitions {
  private readonly createDirDefinition = new WorkspaceCreateDirOpenAiToolDefinition();
  private readonly editDefinition = new WorkspaceEditOpenAiToolDefinition();
  private readonly listDefinition = new WorkspaceListOpenAiToolDefinition();
  private readonly readDefinition = new WorkspaceReadOpenAiToolDefinition();
  private readonly writeDefinition = new WorkspaceWriteOpenAiToolDefinition();

  list(): OpenAIChatTool[] {
    return [
      this.readDefinition.create(),
      this.writeDefinition.create(),
      this.editDefinition.create(),
      this.listDefinition.create(),
      this.createDirDefinition.create()
    ];
  }
}
