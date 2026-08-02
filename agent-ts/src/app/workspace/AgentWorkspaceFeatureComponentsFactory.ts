import { WorkspaceManager } from "../../workspace/WorkspaceManager.js";
import { WorkspaceOpenAiToolBridge } from "../../workspace/tools/WorkspaceOpenAiToolBridge.js";
import { AgentWorkspaceFeatureComponents } from "./AgentWorkspaceFeatureComponents.js";

export class AgentWorkspaceFeatureComponentsFactory {
  create(workspaceBasePath: string): AgentWorkspaceFeatureComponents {
    const manager = new WorkspaceManager(workspaceBasePath);
    return new AgentWorkspaceFeatureComponents(manager, new WorkspaceOpenAiToolBridge(manager));
  }
}
