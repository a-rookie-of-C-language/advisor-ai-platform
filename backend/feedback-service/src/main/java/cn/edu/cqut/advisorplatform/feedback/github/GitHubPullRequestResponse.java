package cn.edu.cqut.advisorplatform.feedback.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubPullRequestResponse {

  @JsonProperty("html_url")
  private String htmlUrl;
}
