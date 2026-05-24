package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class McpServerHandler {

  private static final String JSONRPC = "2.0";
  private static final Logger log = LoggerFactory.getLogger(McpServerHandler.class);

  private final Map<String, ToolHandler> tools = new HashMap<>();
  private final StudentMcpTools studentMcpTools;

  McpServerHandler(StudentMcpTools studentMcpTools) {
    this.studentMcpTools = studentMcpTools;
    registerTools();
  }

  private void registerTools() {
    tools.put(
        "list_students",
        arguments -> {
          String keyword =
              arguments.containsKey("keyword") ? String.valueOf(arguments.get("keyword")) : null;
          int page =
              arguments.containsKey("page") ? ((Number) arguments.get("page")).intValue() : 0;
          int size =
              arguments.containsKey("size") ? ((Number) arguments.get("size")).intValue() : 10;
          return studentMcpTools.executeListStudents(keyword, page, size);
        });

    tools.put(
        "get_student",
        arguments -> {
          long studentId = ((Number) arguments.get("student_id")).longValue();
          return studentMcpTools.executeGetStudent(studentId);
        });

    tools.put(
        "get_student_checkin_summary",
        arguments -> {
          long studentId = ((Number) arguments.get("student_id")).longValue();
          return studentMcpTools.executeGetStudentCheckInSummary(studentId);
        });

    tools.put(
        "get_student_checkin_detail",
        arguments -> {
          long studentId = ((Number) arguments.get("student_id")).longValue();
          int limit =
              arguments.containsKey("limit") ? ((Number) arguments.get("limit")).intValue() : 10;
          return studentMcpTools.executeGetStudentCheckInDetail(studentId, limit);
        });
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
    List<Map<String, Object>> toolList = new ArrayList<>();

    toolList.add(
        Map.of(
            "name", "list_students",
            "description", "List students with optional keyword and pagination.",
            "inputSchema",
                Map.of(
                    "type",
                    "object",
                    "properties",
                    Map.of(
                        "keyword", Map.of("type", "string", "description", "Search keyword."),
                        "page",
                            Map.of("type", "integer", "description", "Page number.", "default", 0),
                        "size",
                            Map.of(
                                "type", "integer", "description", "Page size.", "default", 10)))));

    toolList.add(
        Map.of(
            "name", "get_student",
            "description", "Get student details by student id.",
            "inputSchema",
                Map.of(
                    "type", "object",
                    "properties",
                        Map.of(
                            "student_id", Map.of("type", "integer", "description", "Student id.")),
                    "required", List.of("student_id"))));

    toolList.add(
        Map.of(
            "name", "get_student_checkin_summary",
            "description", "Get student check-in summary.",
            "inputSchema",
                Map.of(
                    "type", "object",
                    "properties",
                        Map.of(
                            "student_id", Map.of("type", "integer", "description", "Student id.")),
                    "required", List.of("student_id"))));

    toolList.add(
        Map.of(
            "name", "get_student_checkin_detail",
            "description", "Get recent student check-in records.",
            "inputSchema",
                Map.of(
                    "type", "object",
                    "properties",
                        Map.of(
                            "student_id", Map.of("type", "integer", "description", "Student id."),
                            "limit",
                                Map.of(
                                    "type",
                                    "integer",
                                    "description",
                                    "Record limit.",
                                    "default",
                                    10)),
                    "required", List.of("student_id"))));

    return createResultResponse(id, Map.of("tools", toolList));
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

    ToolHandler handler = tools.get(toolName);
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
