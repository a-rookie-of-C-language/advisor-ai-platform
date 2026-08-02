import type { McpToolService } from "./McpToolService.js";
import { WorkspaceError } from "../../workspace/model/WorkspaceError.js";

export class McpToolServiceGuard {
  requireEnabled(mcpToolService: McpToolService | undefined): McpToolService {
    if (!mcpToolService) {
      throw new WorkspaceError("MCP tools 未启用");
    }
    return mcpToolService;
  }
}
