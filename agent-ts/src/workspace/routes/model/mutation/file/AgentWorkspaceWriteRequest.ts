import type { AgentWorkspaceScope } from "../../scope/AgentWorkspaceScope.js";

export interface AgentWorkspaceWriteRequest {
  content: string;
  isFinal: boolean;
  path: string;
  scope: AgentWorkspaceScope;
}
