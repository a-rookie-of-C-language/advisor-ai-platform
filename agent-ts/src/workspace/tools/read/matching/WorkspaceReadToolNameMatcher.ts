export class WorkspaceReadToolNameMatcher {
  matches(toolName: string): boolean {
    return toolName === "workspace_read" || toolName === "workspace_list";
  }
}
