import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiToolCatalog } from "./WorkspaceOpenAiToolCatalog.js";
import { WorkspaceOpenAiToolExecutor } from "./WorkspaceOpenAiToolExecutor.js";
import { WorkspaceOpenAiToolResultFactory } from "./WorkspaceOpenAiToolResultFactory.js";

export class WorkspaceOpenAiToolBridgeComponents {
  readonly catalog = new WorkspaceOpenAiToolCatalog();
  readonly executor: WorkspaceOpenAiToolExecutor;
  readonly resultFactory = new WorkspaceOpenAiToolResultFactory();

  constructor(workspaceManager: WorkspaceManager) {
    this.executor = new WorkspaceOpenAiToolExecutor(workspaceManager);
  }
}
