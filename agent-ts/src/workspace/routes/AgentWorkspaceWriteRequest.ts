import type { AgentWorkspaceScope } from "./AgentWorkspaceScope.js";

export interface AgentWorkspaceWriteRequest {
  content: string;
  isFinal: boolean;
  path: string;
  scope: AgentWorkspaceScope;
}
