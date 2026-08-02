import type { AgentWorkspaceScope } from "./AgentWorkspaceScope.js";

export interface AgentWorkspaceEditRequest {
  isFinal: boolean;
  newString: string;
  oldString: string;
  path: string;
  scope: AgentWorkspaceScope;
}
