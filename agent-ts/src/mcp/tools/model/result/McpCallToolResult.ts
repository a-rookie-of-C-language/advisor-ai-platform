import type { McpToolContent } from "../content/McpToolContent.js";

export interface McpCallToolResult {
  content: McpToolContent[];
  isError: boolean;
}
