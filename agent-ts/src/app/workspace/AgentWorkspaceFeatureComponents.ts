import type { WorkspaceManager } from "../../workspace/WorkspaceManager.js";
import type { WorkspaceOpenAiToolBridge } from "../../workspace/tools/WorkspaceOpenAiToolBridge.js";

export class AgentWorkspaceFeatureComponents {
  constructor(
    readonly manager: WorkspaceManager,
    readonly openAiToolBridge: WorkspaceOpenAiToolBridge
  ) {}
}
