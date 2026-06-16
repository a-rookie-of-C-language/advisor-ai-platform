package cn.edu.cqut.advisorplatform.feedback.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubIssueResponse {

  private Long number;
  private String state;

  @JsonProperty("html_url")
  private String htmlUrl;
}
