package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class McpServerHandler {

  private static final String JSONRPC = "2.0";
  private static final Logger log = LoggerFactory.getLogger(McpServerHandler.class);

  private final McpToolRegistry toolRegistry;

  McpServerHandler(StudentMcpTools studentMcpTools) {
    this.toolRegistry = new McpToolRegistry(studentMcpTools);
  }

  public Map<String, Object> handleRequest(Map<String, Object> request) {
    String method = (String) request.get("method");
    Object id = request.get("id");
    Object params = request.get("params");

    log.info("MCP request: method={}, id={}", method, id);

    try {
      return switch (method) {
        case "initialize" -> handleInitialize(id);
        case "tools/list" -> handleToolsList(id);
        case "tools/call" -> handleToolsCall(id, params);
        case "ping" -> handlePing(id);
        default -> createErrorResponse(id, -32601, "Method not found: " + method);
      };
    } catch (Exception e) {
      log.error("Error handling MCP request", e);
      return createErrorResponse(id, -32603, "Internal error: " + e.getMessage());
    }
  }

  private Map<String, Object> handleInitialize(Object id) {
    Map<String, Object> result = new HashMap<>();
    result.put("protocolVersion", "2024-11-05");
    result.put("serverInfo", Map.of("name", "advisor-ai-platform-mcp", "version", "1.0.0"));
    result.put("capabilities", Map.of("tools", Map.of()));
    return createResultResponse(id, result);
  }

  private Map<String, Object> handleToolsList(Object id) {
    return createResultResponse(id, Map.of("tools", toolRegistry.listTools()));
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> handleToolsCall(Object id, Object params) {
    if (!(params instanceof Map)) {
      return createErrorResponse(id, -32602, "Invalid params");
    }

    Map<String, Object> paramsMap = (Map<String, Object>) params;
    String toolName = (String) paramsMap.get("name");
    Map<String, Object> arguments =
        (Map<String, Object>) paramsMap.getOrDefault("arguments", new HashMap<>());

    ToolHandler handler = toolRegistry.getHandler(toolName);
    if (handler == null) {
      return createErrorResponse(id, -32601, "Tool not found: " + toolName);
    }

    try {
      McpSchema.CallToolResult result = handler.execute(arguments);
      String text = extractText(result.content());
      return createResultResponse(
          id, Map.of("content", List.of(Map.of("type", "text", "text", text))));
    } catch (Exception e) {
      log.error("Tool execution failed: {}", toolName, e);
      return createErrorResponse(id, -32603, "Tool execution failed: " + e.getMessage());
    }
  }

  private String extractText(List<McpSchema.Content> contents) {
    StringBuilder textBuilder = new StringBuilder();
    for (McpSchema.Content content : contents) {
      if (content instanceof McpSchema.TextContent textContent) {
        textBuilder.append(textContent.text());
      }
    }
    return textBuilder.toString();
  }

  private Map<String, Object> handlePing(Object id) {
    return createResultResponse(id, Map.of());
  }

  private Map<String, Object> createResultResponse(Object id, Object result) {
    Map<String, Object> response = new HashMap<>();
    response.put("jsonrpc", JSONRPC);
    response.put("id", id);
    response.put("result", result);
    return response;
  }

  private Map<String, Object> createErrorResponse(Object id, int code, String message) {
    Map<String, Object> response = new HashMap<>();
    response.put("jsonrpc", JSONRPC);
    response.put("id", id);
    response.put("error", Map.of("code", code, "message", message));
    return response;
  }
}
