import type { AgentConfig } from "../../../config/model/core/AgentConfig.js";
import type { WorkspaceManager } from "../../../workspace/core/manager/WorkspaceManager.js";
import type { WorkspaceOpenAiToolBridge } from "../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import { AgentWorkspaceFeatureComponentsFactory } from "../factory/AgentWorkspaceFeatureComponentsFactory.js";

export class AgentWorkspaceComponents {
  readonly manager: WorkspaceManager;
  readonly openAiToolBridge: WorkspaceOpenAiToolBridge;

  constructor(config: AgentConfig) {
    const components = new AgentWorkspaceFeatureComponentsFactory().create(config.workspaceBasePath);
    this.manager = components.manager;
    this.openAiToolBridge = components.openAiToolBridge;
  }
}
