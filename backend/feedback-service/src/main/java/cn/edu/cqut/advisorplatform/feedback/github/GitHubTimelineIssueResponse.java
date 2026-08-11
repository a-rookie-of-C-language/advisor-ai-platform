package cn.edu.cqut.advisorplatform.feedback.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubTimelineIssueResponse {

  private Long number;
  private String title;
  private String state;

  @JsonProperty("html_url")
  private String htmlUrl;

  @JsonProperty("pull_request")
  private GitHubPullRequestResponse pullRequest;
}
