import type { AgentWorkspaceScope } from "../../scope/AgentWorkspaceScope.js";

export interface AgentWorkspaceListRequest {
  path: string;
  recursive: boolean;
  scope: AgentWorkspaceScope;
}
