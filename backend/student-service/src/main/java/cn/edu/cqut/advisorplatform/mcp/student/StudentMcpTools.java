package cn.edu.cqut.advisorplatform.mcp.student;

import cn.edu.cqut.advisorplatform.dto.request.StudentQueryRequest;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentDetailResponse;
import cn.edu.cqut.advisorplatform.service.StudentCheckInService;
import cn.edu.cqut.advisorplatform.service.StudentService;
import io.modelcontextprotocol.spec.McpSchema;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class StudentMcpTools {

  private final StudentService studentService;
  private final StudentCheckInService studentCheckInService;
  private final StudentMcpResultFormatter resultFormatter = new StudentMcpResultFormatter();

  public StudentMcpTools(
      StudentService studentService, StudentCheckInService studentCheckInService) {
    this.studentService = studentService;
    this.studentCheckInService = studentCheckInService;
  }

  public McpSchema.CallToolResult executeListStudents(String keyword, Integer page, Integer size) {
    try {
      StudentQueryRequest request = new StudentQueryRequest();
      if (keyword != null) {
        request.setKeyword(keyword);
      }
      request.setPage(page != null ? page : 0);
      request.setSize(size != null ? size : 10);

      var pageResult = studentService.queryStudents(request);
      return success(
          resultFormatter.formatStudentList(
              pageResult.getTotalElements(), pageResult.getContent()));
    } catch (Exception e) {
      return error("查询学生失败: " + e.getMessage());
    }
  }

  public McpSchema.CallToolResult executeGetStudent(Long studentId) {
    try {
      StudentDetailResponse student = studentService.getStudentById(studentId);
      if (student == null) {
        return success("未找到该学生");
      }

      return success(resultFormatter.formatStudentDetail(student));
    } catch (Exception e) {
      return error("获取学生详情失败: " + e.getMessage());
    }
  }

  public McpSchema.CallToolResult executeGetStudentCheckInSummary(Long studentId) {
    try {
      StudentCheckInSummaryResponse summary =
          studentCheckInService.getStudentCheckInSummary(studentId);

      return success(resultFormatter.formatCheckInSummary(summary));
    } catch (Exception e) {
      return error("获取签到汇总失败: " + e.getMessage());
    }
  }

  public McpSchema.CallToolResult executeGetStudentCheckInDetail(Long studentId, Integer limit) {
    try {
      StudentCheckInDetailResponse detail =
          studentCheckInService.getStudentCheckInDetail(studentId, limit != null ? limit : 10);

      return success(resultFormatter.formatCheckInDetail(detail));
    } catch (Exception e) {
      return error("获取签到详情失败: " + e.getMessage());
    }
  }

  private McpSchema.CallToolResult success(String text) {
    return new McpSchema.CallToolResult(List.of(new McpSchema.TextContent(text)), false);
  }

  private McpSchema.CallToolResult error(String text) {
    return new McpSchema.CallToolResult(List.of(new McpSchema.TextContent(text)), true);
  }
}
