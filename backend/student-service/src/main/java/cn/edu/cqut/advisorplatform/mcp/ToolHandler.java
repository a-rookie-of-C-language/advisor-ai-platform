package cn.edu.cqut.advisorplatform.mcp;

import io.modelcontextprotocol.spec.McpSchema;
import java.util.Map;

@FunctionalInterface
interface ToolHandler {
  McpSchema.CallToolResult execute(Map<String, Object> arguments);
}
