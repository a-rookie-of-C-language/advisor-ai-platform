package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.config.McpServerConfig;
import cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.http.HttpServletTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@ConditionalOnProperty(name = "advisor.mcp.server.enabled", havingValue = "true")
public class McpController {

  private static final Logger log = LoggerFactory.getLogger(McpController.class);
  private static final String MCP_PROTOCOL_VERSION = "2024-11-05";

  private final McpServer mcpServer;
  private final McpServerConfig mcpServerConfig;

  @Autowired
  public McpController(McpServer mcpServer, McpServerConfig mcpServerConfig) {
    this.mcpServer = mcpServer;
    this.mcpServerConfig = mcpServerConfig;
    log.info("MCP Controller initialized");
  }

  @PostMapping(value = "/mcp/message", consumes = "application/json", produces = "application/json")
  public Map<String, Object> handleMessage(
      @RequestBody Map<String, Object> request,
      @RequestHeader(value = "Authorization", required = false) String authHeader) {

    // Token 认证
    if (!mcpServerConfig.getToken().isEmpty()) {
      if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        return createErrorResponse(request, -32600, "Unauthorized");
      }
      String token = authHeader.substring(7);
      if (!token.equals(mcpServerConfig.getToken())) {
        return createErrorResponse(request, -32600, "Invalid token");
      }
    }

    return mcpServer.exchange(request);
  }

  private Map<String, Object> createErrorResponse(
      Map<String, Object> request, int code, String message) {
    return Map.of(
        "jsonrpc", "2.0",
        "id", request.getOrDefault("id", null),
        "error", Map.of("code", code, "message", message));
  }

  @org.springframework.web.bind.annotation.GetMapping(
      value = "/mcp/sse",
      produces = "text/event-stream")
  public SseEmitter sseEndpoint(HttpServletRequest request) {
    if (!validateToken(request)) {
      throw new RuntimeException("Unauthorized");
    }
    return new SseEmitter(Long.MAX_VALUE);
  }

  private boolean validateToken(HttpServletRequest request) {
    String token = mcpServerConfig.getToken();
    if (token == null || token.isEmpty()) {
      return true;
    }
    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return false;
    }
    return authHeader.substring(7).equals(token);
  }
}

@Configuration
@ConditionalOnProperty(name = "advisor.mcp.server.enabled", havingValue = "true")
class McpServerConfiguration {

  private final StudentMcpTools studentMcpTools;
  private final McpServerConfig mcpServerConfig;

  public McpServerConfiguration(StudentMcpTools studentMcpTools, McpServerConfig mcpServerConfig) {
    this.studentMcpTools = studentMcpTools;
    this.mcpServerConfig = mcpServerConfig;
  }

  @Bean
  public McpServer mcpServer() {
    McpServerFeatures.Builder featuresBuilder = McpServerFeatures.Builder.builder();

    // 注册 list_students 工具
    featuresBuilder.addTool(
        new McpSchema.Tool(
            "list_students",
            "分页查询学生列表，支持关键字搜索和分页",
            new McpSchema.JsonSchema(
                """
                {
                  "type": "object",
                  "properties": {
                    "keyword": {"type": "string", "description": "搜索关键字，可匹配学号或姓名"},
                    "page": {"type": "integer", "description": "页码，从0开始", "default": 0},
                    "size": {"type": "integer", "description": "每页数量", "default": 10}
                  }
                }
                """)),
        (callContext, arguments) -> {
          String keyword =
              arguments.containsKey("keyword") ? String.valueOf(arguments.get("keyword")) : null;
          Integer page =
              arguments.containsKey("page") ? ((Number) arguments.get("page")).intValue() : 0;
          Integer size =
              arguments.containsKey("size") ? ((Number) arguments.get("size")).intValue() : 10;
          return studentMcpTools.executeListStudents(keyword, page, size);
        });

    // 注册 get_student 工具
    featuresBuilder.addTool(
        new McpSchema.Tool(
            "get_student",
            "根据学生ID获取学生详细信息",
            new McpSchema.JsonSchema(
                """
                {
                  "type": "object",
                  "properties": {
                    "student_id": {"type": "integer", "description": "学生ID"}
                  },
                  "required": ["student_id"]
                }
                """)),
        (callContext, arguments) -> {
          Long studentId = ((Number) arguments.get("student_id")).longValue();
          return studentMcpTools.executeGetStudent(studentId);
        });

    // 注册 get_student_checkin_summary 工具
    featuresBuilder.addTool(
        new McpSchema.Tool(
            "get_student_checkin_summary",
            "获取学生签到情况汇总",
            new McpSchema.JsonSchema(
                """
                {
                  "type": "object",
                  "properties": {
                    "student_id": {"type": "integer", "description": "学生ID"}
                  },
                  "required": ["student_id"]
                }
                """)),
        (callContext, arguments) -> {
          Long studentId = ((Number) arguments.get("student_id")).longValue();
          return studentMcpTools.executeGetStudentCheckInSummary(studentId);
        });

    // 注册 get_student_checkin_detail 工具
    featuresBuilder.addTool(
        new McpSchema.Tool(
            "get_student_checkin_detail",
            "获取学生签到明细，包括最近N条签到记录",
            new McpSchema.JsonSchema(
                """
                {
                  "type": "object",
                  "properties": {
                    "student_id": {"type": "integer", "description": "学生ID"},
                    "limit": {"type": "integer", "description": "返回最近N条记录", "default": 10}
                  },
                  "required": ["student_id"]
                }
                """)),
        (callContext, arguments) -> {
          Long studentId = ((Number) arguments.get("student_id")).longValue();
          Integer limit =
              arguments.containsKey("limit") ? ((Number) arguments.get("limit")).intValue() : 10;
          return studentMcpTools.executeGetStudentCheckInDetail(studentId, limit);
        });

    McpSchema.ServerCapabilities serverCapabilities =
        McpSchema.ServerCapabilities.builder().withTools(new McpSchema.ToolsCapability()).build();

    return McpServer.builder(serverCapabilities, featuresBuilder.build()).build();
  }

  @Bean
  public HttpServletTransportProvider mcpTransportProvider(McpServer mcpServer) {
    return new HttpServletTransportProvider(mcpServer, false);
  }
}
