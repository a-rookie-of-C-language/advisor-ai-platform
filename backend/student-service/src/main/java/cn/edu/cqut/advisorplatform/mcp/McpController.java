package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.config.McpServerConfig;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
