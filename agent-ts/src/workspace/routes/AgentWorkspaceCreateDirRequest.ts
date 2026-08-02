import type { AgentWorkspaceScope } from "./AgentWorkspaceScope.js";

export interface AgentWorkspaceCreateDirRequest {
  isFinal: boolean;
  path: string;
  scope: AgentWorkspaceScope;
}
