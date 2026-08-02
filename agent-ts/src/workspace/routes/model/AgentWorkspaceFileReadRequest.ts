import type { AgentWorkspaceScope } from "./AgentWorkspaceScope.js";

export interface AgentWorkspaceFileReadRequest {
  limit: number;
  offset: number;
  path: string;
  scope: AgentWorkspaceScope;
}
