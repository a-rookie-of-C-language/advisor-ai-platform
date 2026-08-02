import { WorkspaceManager } from "../../workspace/core/WorkspaceManager.js";
import { WorkspaceOpenAiToolBridge } from "../../workspace/tools/core/WorkspaceOpenAiToolBridge.js";
import { AgentWorkspaceFeatureComponents } from "./AgentWorkspaceFeatureComponents.js";

export class AgentWorkspaceFeatureComponentsFactory {
  create(workspaceBasePath: string): AgentWorkspaceFeatureComponents {
    const manager = new WorkspaceManager(workspaceBasePath);
    return new AgentWorkspaceFeatureComponents(manager, new WorkspaceOpenAiToolBridge(manager));
  }
}
