package cn.edu.cqut.advisorplatform.feedback.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GitHubPullRequestDTO {

  private Long number;
  private String title;
  private String state;
  private String url;
}
