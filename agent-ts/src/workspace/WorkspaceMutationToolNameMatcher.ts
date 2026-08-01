export class WorkspaceMutationToolNameMatcher {
  matches(toolName: string): boolean {
    return toolName === "workspace_write" || toolName === "workspace_edit" || toolName === "workspace_create_dir";
  }
}
