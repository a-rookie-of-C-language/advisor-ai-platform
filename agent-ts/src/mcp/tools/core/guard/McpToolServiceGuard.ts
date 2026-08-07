import { WorkspaceError } from "../../../../workspace/model/error/WorkspaceError.js";
import type { McpToolService } from "../service/McpToolService.js";

export class McpToolServiceGuard {
  requireEnabled(mcpToolService: McpToolService | undefined): McpToolService {
    if (!mcpToolService) {
      throw new WorkspaceError("MCP tools 未启用");
    }
    return mcpToolService;
  }
}
