package cn.edu.cqut.advisorplatform.feedback.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "advisor.github")
public class GitHubProperties {

  private String token;
  private String owner;
  private String repo;
  private String apiBaseUrl = "https://api.github.com";
}
