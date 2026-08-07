import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { WorkspaceOpenAiToolBridgeComponents } from "../model/WorkspaceOpenAiToolBridgeComponents.js";

export class WorkspaceOpenAiToolBridgeComponentsFactory {
  create(workspaceManager: WorkspaceManager): WorkspaceOpenAiToolBridgeComponents {
    return new WorkspaceOpenAiToolBridgeComponents(workspaceManager);
  }
}
