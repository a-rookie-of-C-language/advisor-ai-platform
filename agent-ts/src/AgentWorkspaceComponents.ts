import type { AgentConfig } from "./config/AgentConfig.js";
import { WorkspaceManager } from "./workspace/WorkspaceManager.js";
import { WorkspaceOpenAiToolBridge } from "./workspace/WorkspaceOpenAiToolBridge.js";

export class AgentWorkspaceComponents {
  readonly manager: WorkspaceManager;
  readonly openAiToolBridge: WorkspaceOpenAiToolBridge;

  constructor(config: AgentConfig) {
    this.manager = new WorkspaceManager(config.workspaceBasePath);
    this.openAiToolBridge = new WorkspaceOpenAiToolBridge(this.manager);
  }
}
