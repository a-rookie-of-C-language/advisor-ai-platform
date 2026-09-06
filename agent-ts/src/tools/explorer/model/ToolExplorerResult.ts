export interface ToolExplorerResult {
  readonly matchedTools: readonly string[];
  readonly reason: "route_match" | "text_match" | "none";
  readonly summary: string;
  readonly evidence: readonly { readonly tool_name: string; readonly status: string; readonly message: string; readonly items: readonly unknown[] }[];
  readonly toolCalls: readonly { readonly tool_name: string; readonly arguments: Record<string, unknown>; readonly status: string; readonly message: string }[];
  readonly sufficient?: boolean;
}
