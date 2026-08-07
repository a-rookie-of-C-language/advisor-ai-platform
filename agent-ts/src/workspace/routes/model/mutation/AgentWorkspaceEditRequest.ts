import type { AgentWorkspaceScope } from "../scope/AgentWorkspaceScope.js";

export interface AgentWorkspaceEditRequest {
  isFinal: boolean;
  newString: string;
  oldString: string;
  path: string;
  scope: AgentWorkspaceScope;
}
