import type { AgentConfig } from "../../config/AgentConfig.js";
import type { WorkspaceManager } from "../../workspace/WorkspaceManager.js";
import type { WorkspaceOpenAiToolBridge } from "../../workspace/WorkspaceOpenAiToolBridge.js";
import { AgentWorkspaceFeatureComponentsFactory } from "./AgentWorkspaceFeatureComponentsFactory.js";

export class AgentWorkspaceComponents {
  readonly manager: WorkspaceManager;
  readonly openAiToolBridge: WorkspaceOpenAiToolBridge;

  constructor(config: AgentConfig) {
    const components = new AgentWorkspaceFeatureComponentsFactory().create(config.workspaceBasePath);
    this.manager = components.manager;
    this.openAiToolBridge = components.openAiToolBridge;
  }
}
