package cn.edu.cqut.advisorplatform.feedback.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubCommentResponse {

  private Long id;

  @JsonProperty("html_url")
  private String htmlUrl;
}
