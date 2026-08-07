import type { WorkspaceManager } from "../../../workspace/core/WorkspaceManager.js";
import type { WorkspaceOpenAiToolBridge } from "../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";

export class AgentWorkspaceFeatureComponents {
  constructor(
    readonly manager: WorkspaceManager,
    readonly openAiToolBridge: WorkspaceOpenAiToolBridge
  ) {}
}
