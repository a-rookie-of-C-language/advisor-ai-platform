package cn.edu.cqut.advisorplatform.feedback.github;

import lombok.Data;

@Data
public class GitHubTimelineEventResponse {

  private String event;
  private GitHubTimelineSourceResponse source;
}
