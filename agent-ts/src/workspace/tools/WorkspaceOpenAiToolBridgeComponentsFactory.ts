import type { WorkspaceManager } from "../WorkspaceManager.js";
import { WorkspaceOpenAiToolBridgeComponents } from "./WorkspaceOpenAiToolBridgeComponents.js";

export class WorkspaceOpenAiToolBridgeComponentsFactory {
  create(workspaceManager: WorkspaceManager): WorkspaceOpenAiToolBridgeComponents {
    return new WorkspaceOpenAiToolBridgeComponents(workspaceManager);
  }
}
