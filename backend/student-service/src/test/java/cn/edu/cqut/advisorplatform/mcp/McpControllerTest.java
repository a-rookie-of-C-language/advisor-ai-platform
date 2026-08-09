package cn.edu.cqut.advisorplatform.mcp;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import cn.edu.cqut.advisorplatform.config.McpServerConfig;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class McpControllerTest {

  @Mock private cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools studentMcpTools;

  private McpServerHandler handler;

  @BeforeEach
  void setUp() {
    handler = new McpServerHandler(studentMcpTools);
  }

  @Test
  void testHandleInitialize() {
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 1, "method", "initialize", "params", Map.of());

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(1, response.get("id"));

    @SuppressWarnings("unchecked")
    Map<String, Object> result = (Map<String, Object>) response.get("result");
    assertEquals("2024-11-05", result.get("protocolVersion"));

    @SuppressWarnings("unchecked")
    Map<String, Object> serverInfo = (Map<String, Object>) result.get("serverInfo");
    assertEquals("advisor-ai-platform-mcp", serverInfo.get("name"));
    assertEquals("1.0.0", serverInfo.get("version"));
  }

  @Test
  void testHandleToolsList() {
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 2, "method", "tools/list", "params", Map.of());

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(2, response.get("id"));

    @SuppressWarnings("unchecked")
    Map<String, Object> result = (Map<String, Object>) response.get("result");
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> tools = (List<Map<String, Object>>) result.get("tools");

    assertEquals(4, tools.size());

    // Verify tool names
    assertEquals("list_students", tools.get(0).get("name"));
    assertEquals("get_student", tools.get(1).get("name"));
    assertEquals("get_student_checkin_summary", tools.get(2).get("name"));
    assertEquals("get_student_checkin_detail", tools.get(3).get("name"));
  }

  @Test
  void testHandleToolsCallListStudents() {
    // Mock the tool execution
    McpSchema.CallToolResult mockResult =
        new McpSchema.CallToolResult(
            List.of(new McpSchema.TextContent("{\"students\":[]}")), false);
    when(studentMcpTools.executeListStudents(any(), anyInt(), anyInt())).thenReturn(mockResult);

    Map<String, Object> request =
        Map.of(
            "jsonrpc",
            "2.0",
            "id",
            3,
            "method",
            "tools/call",
            "params",
            Map.of(
                "name",
                "list_students",
                "arguments",
                Map.of("keyword", "test", "page", 0, "size", 10)));

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(3, response.get("id"));
    assertNotNull(response.get("result"));

    verify(studentMcpTools).executeListStudents("test", 0, 10);
  }

  @Test
  void testHandleToolsCallGetStudent() {
    // Mock the tool execution
    McpSchema.CallToolResult mockResult =
        new McpSchema.CallToolResult(
            List.of(new McpSchema.TextContent("{\"id\":1,\"name\":\"张三\"}")), false);
    when(studentMcpTools.executeGetStudent(1L)).thenReturn(mockResult);

    Map<String, Object> request =
        Map.of(
            "jsonrpc",
            "2.0",
            "id",
            4,
            "method",
            "tools/call",
            "params",
            Map.of("name", "get_student", "arguments", Map.of("student_id", 1)));

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(4, response.get("id"));

    @SuppressWarnings("unchecked")
    Map<String, Object> result = (Map<String, Object>) response.get("result");
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> content = (List<Map<String, Object>>) result.get("content");
    assertEquals("text", content.get(0).get("type"));
    assertTrue(((String) content.get(0).get("text")).contains("张三"));

    verify(studentMcpTools).executeGetStudent(1L);
  }

  @Test
  void testHandlePing() {
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 5, "method", "ping", "params", Map.of());

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(5, response.get("id"));
    assertNotNull(response.get("result"));
  }

  @Test
  void testHandleUnknownMethod() {
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 6, "method", "unknown/method", "params", Map.of());

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(6, response.get("id"));
    assertNotNull(response.get("error"));

    @SuppressWarnings("unchecked")
    Map<String, Object> error = (Map<String, Object>) response.get("error");
    assertEquals(-32601, error.get("code")); // Method not found
  }

  @Test
  void testHandleToolNotFound() {
    Map<String, Object> request =
        Map.of(
            "jsonrpc",
            "2.0",
            "id",
            7,
            "method",
            "tools/call",
            "params",
            Map.of("name", "nonexistent_tool", "arguments", Map.of()));

    Map<String, Object> response = handler.handleRequest(request);

    assertEquals("2.0", response.get("jsonrpc"));
    assertEquals(7, response.get("id"));
    assertNotNull(response.get("error"));

    @SuppressWarnings("unchecked")
    Map<String, Object> error = (Map<String, Object>) response.get("error");
    assertEquals(-32601, error.get("code")); // Method not found
  }

  @Test
  void handleMessageRejectsWhenServerTokenBlank() {
    McpServerHandler mcpHandler = mock(McpServerHandler.class);
    McpServerConfig config = new McpServerConfig();
    config.setToken("");
    McpController controller = new McpController(mcpHandler, config);
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 8, "method", "ping", "params", Map.of());

    Map<String, Object> response = controller.handleMessage(request, "Bearer any-token");

    assertUnauthorized(response, "server token not configured");
    verifyNoInteractions(mcpHandler);
  }

  @Test
  void handleMessageRejectsMissingToken() {
    McpServerHandler mcpHandler = mock(McpServerHandler.class);
    McpServerConfig config = new McpServerConfig();
    config.setToken("secure-token");
    McpController controller = new McpController(mcpHandler, config);
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 9, "method", "ping", "params", Map.of());

    Map<String, Object> response = controller.handleMessage(request, null);

    assertUnauthorized(response, "missing token");
    verifyNoInteractions(mcpHandler);
  }

  @Test
  void handleMessageRejectsInvalidToken() {
    McpServerHandler mcpHandler = mock(McpServerHandler.class);
    McpServerConfig config = new McpServerConfig();
    config.setToken("secure-token");
    McpController controller = new McpController(mcpHandler, config);
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 10, "method", "ping", "params", Map.of());

    Map<String, Object> response = controller.handleMessage(request, "Bearer wrong-token");

    assertUnauthorized(response, "invalid token");
    verifyNoInteractions(mcpHandler);
  }

  @Test
  void handleMessageDelegatesWithValidToken() {
    McpServerHandler mcpHandler = mock(McpServerHandler.class);
    McpServerConfig config = new McpServerConfig();
    config.setToken("secure-token");
    McpController controller = new McpController(mcpHandler, config);
    Map<String, Object> request =
        Map.of("jsonrpc", "2.0", "id", 11, "method", "ping", "params", Map.of());
    Map<String, Object> expected = Map.of("jsonrpc", "2.0", "id", 11, "result", Map.of());
    when(mcpHandler.handleRequest(request)).thenReturn(expected);

    Map<String, Object> response = controller.handleMessage(request, "Bearer secure-token");

    assertSame(expected, response);
    verify(mcpHandler).handleRequest(request);
  }

  private void assertUnauthorized(Map<String, Object> response, String expectedMessageFragment) {
    assertEquals("2.0", response.get("jsonrpc"));
    assertNotNull(response.get("error"));
    @SuppressWarnings("unchecked")
    Map<String, Object> error = (Map<String, Object>) response.get("error");
    assertEquals(-32600, error.get("code"));
    assertTrue(((String) error.get("message")).contains(expectedMessageFragment));
  }
}
