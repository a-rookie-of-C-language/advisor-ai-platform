import type { AgentWorkspaceScope } from "../scope/AgentWorkspaceScope.js";

export interface AgentWorkspaceCreateDirRequest {
  isFinal: boolean;
  path: string;
  scope: AgentWorkspaceScope;
}
