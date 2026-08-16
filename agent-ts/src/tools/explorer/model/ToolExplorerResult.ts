export interface ToolExplorerResult {
  readonly matchedTools: readonly string[];
  readonly reason: "route_match" | "text_match" | "none";
}
