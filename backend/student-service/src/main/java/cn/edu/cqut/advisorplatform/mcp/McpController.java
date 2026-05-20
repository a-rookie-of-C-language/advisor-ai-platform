package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.config.McpServerConfig;
import cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnProperty(name = "advisor.mcp.server.enabled", havingValue = "true")
public class McpController {

  private static final Logger log = LoggerFactory.getLogger(McpController.class);
  private static final String JSONRPC = "2.0";

  private final McpServerHandler mcpHandler;
  private final McpServerConfig mcpServerConfig;

  @Autowired
  public McpController(McpServerHandler mcpHandler, McpServerConfig mcpServerConfig) {
    this.mcpHandler = mcpHandler;
    this.mcpServerConfig = mcpServerConfig;
    log.info("MCP Controller initialized");
  }

  @PostMapping(
      value = "/mcp/message",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, Object> handleMessage(
      @RequestBody Map<String, Object> request,
      @RequestHeader(value = "Authorization", required = false) String authHeader) {

    // Token 认证
    if (!mcpServerConfig.getToken().isEmpty()) {
      if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        return createErrorResponse(request, -32600, "Unauthorized: missing token");
      }
      String token = authHeader.substring(7);
      if (!token.equals(mcpServerConfig.getToken())) {
        return createErrorResponse(request, -32600, "Unauthorized: invalid token");
      }
    }

    return mcpHandler.handleRequest(request);
  }

  private Map<String, Object> createErrorResponse(
      Map<String, Object> request, int code, String message) {
    return Map.of(
        "jsonrpc", JSONRPC,
        "id", request.getOrDefault("id", "null"),
        "error", Map.of("code", code, "message", message));
  }
}

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
        (arguments) -> {
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
        (arguments) -> {
          long studentId = ((Number) arguments.get("student_id")).longValue();
          return studentMcpTools.executeGetStudent(studentId);
        });

    tools.put(
        "get_student_checkin_summary",
        (arguments) -> {
          long studentId = ((Number) arguments.get("student_id")).longValue();
          return studentMcpTools.executeGetStudentCheckInSummary(studentId);
        });

    tools.put(
        "get_student_checkin_detail",
        (arguments) -> {
          long studentId = ((Number) arguments.get("student_id")).longValue();
          int limit =
              arguments.containsKey("limit") ? ((Number) arguments.get("limit")).intValue() : 10;
          return studentMcpTools.executeGetStudentCheckInDetail(studentId, limit);
        });
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> handleRequest(Map<String, Object> request) {
    String method = (String) request.get("method");
    Object id = request.get("id");
    Object params = request.get("params");

    log.info("MCP request: method={}, id={}", method, id);

    try {
      return switch (method) {
        case "initialize" -> handleInitialize(id, params);
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

  private Map<String, Object> handleInitialize(Object id, Object params) {
    Map<String, Object> result = new HashMap<>();
    result.put("protocolVersion", "2024-11-05");
    result.put(
        "serverInfo",
        Map.of(
            "name", "advisor-ai-platform-mcp",
            "version", "1.0.0"));
    result.put("capabilities", Map.of("tools", Map.of()));

    Map<String, Object> response = new HashMap<>();
    response.put("jsonrpc", JSONRPC);
    response.put("id", id);
    response.put("result", result);
    return response;
  }

  private Map<String, Object> handleToolsList(Object id) {
    List<Map<String, Object>> toolList = new ArrayList<>();

    toolList.add(
        Map.of(
            "name", "list_students",
            "description", "分页查询学生列表，支持关键字搜索和分页",
            "inputSchema",
                Map.of(
                    "type",
                    "object",
                    "properties",
                    Map.of(
                        "keyword", Map.of("type", "string", "description", "搜索关键字，可匹配学号或姓名"),
                        "page", Map.of("type", "integer", "description", "页码，从0开始", "default", 0),
                        "size", Map.of("type", "integer", "description", "每页数量", "default", 10)))));

    toolList.add(
        Map.of(
            "name", "get_student",
            "description", "根据学生ID获取学生详细信息",
            "inputSchema",
                Map.of(
                    "type", "object",
                    "properties",
                        Map.of("student_id", Map.of("type", "integer", "description", "学生ID")),
                    "required", List.of("student_id"))));

    toolList.add(
        Map.of(
            "name", "get_student_checkin_summary",
            "description", "获取学生签到情况汇总",
            "inputSchema",
                Map.of(
                    "type", "object",
                    "properties",
                        Map.of("student_id", Map.of("type", "integer", "description", "学生ID")),
                    "required", List.of("student_id"))));

    toolList.add(
        Map.of(
            "name", "get_student_checkin_detail",
            "description", "获取学生签到明细，包括最近N条签到记录",
            "inputSchema",
                Map.of(
                    "type", "object",
                    "properties",
                        Map.of(
                            "student_id", Map.of("type", "integer", "description", "学生ID"),
                            "limit",
                                Map.of(
                                    "type", "integer", "description", "返回最近N条记录", "default", 10)),
                    "required", List.of("student_id"))));

    Map<String, Object> result = new HashMap<>();
    result.put("tools", toolList);

    Map<String, Object> response = new HashMap<>();
    response.put("jsonrpc", JSONRPC);
    response.put("id", id);
    response.put("result", result);
    return response;
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
      List<McpSchema.Content> contents = result.content();

      // 提取文本内容
      StringBuilder textBuilder = new StringBuilder();
      for (McpSchema.Content content : contents) {
        if (content instanceof McpSchema.TextContent textContent) {
          textBuilder.append(textContent.text());
        }
      }

      Map<String, Object> response = new HashMap<>();
      response.put("jsonrpc", JSONRPC);
      response.put("id", id);
      response.put(
          "result",
          Map.of("content", List.of(Map.of("type", "text", "text", textBuilder.toString()))));
      return response;
    } catch (Exception e) {
      log.error("Tool execution failed: {}", toolName, e);
      return createErrorResponse(id, -32603, "Tool execution failed: " + e.getMessage());
    }
  }

  private Map<String, Object> handlePing(Object id) {
    Map<String, Object> response = new HashMap<>();
    response.put("jsonrpc", JSONRPC);
    response.put("id", id);
    response.put("result", Map.of());
    return response;
  }

  private Map<String, Object> createErrorResponse(Object id, int code, String message) {
    Map<String, Object> response = new HashMap<>();
    response.put("jsonrpc", JSONRPC);
    response.put("id", id);
    response.put(
        "error",
        Map.of(
            "code", code,
            "message", message));
    return response;
  }

  @FunctionalInterface
  interface ToolHandler {
    McpSchema.CallToolResult execute(Map<String, Object> arguments);
  }
}

@Configuration
@ConditionalOnProperty(name = "advisor.mcp.server.enabled", havingValue = "true")
class McpServerConfiguration {

  private final StudentMcpTools studentMcpTools;

  public McpServerConfiguration(StudentMcpTools studentMcpTools) {
    this.studentMcpTools = studentMcpTools;
  }

  @Bean
  public McpServerHandler mcpServerHandler() {
    return new McpServerHandler(studentMcpTools);
  }
}
