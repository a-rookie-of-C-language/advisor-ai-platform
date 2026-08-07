import type { OpenAIChatTool } from "../../../../openai/chat/model/OpenAIChatTool.js";
import { WorkspaceCreateDirOpenAiToolDefinition } from "../model/WorkspaceCreateDirOpenAiToolDefinition.js";
import { WorkspaceEditOpenAiToolDefinition } from "../model/WorkspaceEditOpenAiToolDefinition.js";
import { WorkspaceListOpenAiToolDefinition } from "../model/WorkspaceListOpenAiToolDefinition.js";
import { WorkspaceReadOpenAiToolDefinition } from "../model/WorkspaceReadOpenAiToolDefinition.js";
import { WorkspaceWriteOpenAiToolDefinition } from "../model/WorkspaceWriteOpenAiToolDefinition.js";

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
