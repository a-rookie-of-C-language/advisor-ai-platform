import type { AgentWorkspaceScope } from "../scope/AgentWorkspaceScope.js";

export interface AgentWorkspaceFileReadRequest {
  limit: number;
  offset: number;
  path: string;
  scope: AgentWorkspaceScope;
}
