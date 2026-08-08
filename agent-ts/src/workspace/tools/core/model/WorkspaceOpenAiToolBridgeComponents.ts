import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { WorkspaceOpenAiToolCatalog } from "../../definitions/catalog/WorkspaceOpenAiToolCatalog.js";
import { WorkspaceOpenAiToolExecutor } from "../execution/WorkspaceOpenAiToolExecutor.js";
import { WorkspaceOpenAiToolResultFactory } from "../result/WorkspaceOpenAiToolResultFactory.js";

export class WorkspaceOpenAiToolBridgeComponents {
  readonly catalog = new WorkspaceOpenAiToolCatalog();
  readonly executor: WorkspaceOpenAiToolExecutor;
  readonly resultFactory = new WorkspaceOpenAiToolResultFactory();

  constructor(workspaceManager: WorkspaceManager) {
    this.executor = new WorkspaceOpenAiToolExecutor(workspaceManager);
  }
}
