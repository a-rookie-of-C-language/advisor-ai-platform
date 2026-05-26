package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class McpToolRegistry {

  private final Map<String, ToolHandler> tools = new HashMap<>();

  McpToolRegistry(StudentMcpTools studentMcpTools) {
    registerTools(studentMcpTools);
  }

  ToolHandler getHandler(String toolName) {
    return tools.get(toolName);
  }

  List<Map<String, Object>> listTools() {
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

    return toolList;
  }

  private void registerTools(StudentMcpTools studentMcpTools) {
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
}
