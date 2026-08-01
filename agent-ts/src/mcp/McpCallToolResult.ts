import type { McpToolContent } from "./McpToolContent.js";

export interface McpCallToolResult {
  content: McpToolContent[];
  isError: boolean;
}
