import type { AgentWorkspaceScope } from "./AgentWorkspaceScope.js";

export interface AgentWorkspaceListRequest {
  path: string;
  recursive: boolean;
  scope: AgentWorkspaceScope;
}
