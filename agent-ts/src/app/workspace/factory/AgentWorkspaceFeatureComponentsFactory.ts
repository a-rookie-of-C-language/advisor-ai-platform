import { WorkspaceManager } from "../../../workspace/core/manager/WorkspaceManager.js";
import { WorkspaceOpenAiToolBridge } from "../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import { AgentWorkspaceFeatureComponents } from "../model/AgentWorkspaceFeatureComponents.js";

export class AgentWorkspaceFeatureComponentsFactory {
  create(workspaceBasePath: string): AgentWorkspaceFeatureComponents {
    const manager = new WorkspaceManager(workspaceBasePath);
    return new AgentWorkspaceFeatureComponents(manager, new WorkspaceOpenAiToolBridge(manager));
  }
}
