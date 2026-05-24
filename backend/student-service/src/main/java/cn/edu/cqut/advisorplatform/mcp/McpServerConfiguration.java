package cn.edu.cqut.advisorplatform.mcp;

import cn.edu.cqut.advisorplatform.mcp.student.StudentMcpTools;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "advisor.mcp.server.enabled", havingValue = "true")
class McpServerConfiguration {

  private final StudentMcpTools studentMcpTools;

  McpServerConfiguration(StudentMcpTools studentMcpTools) {
    this.studentMcpTools = studentMcpTools;
  }

  @Bean
  McpServerHandler mcpServerHandler() {
    return new McpServerHandler(studentMcpTools);
  }
}
