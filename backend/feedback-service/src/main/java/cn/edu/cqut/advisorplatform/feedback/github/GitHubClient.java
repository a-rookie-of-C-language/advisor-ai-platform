package cn.edu.cqut.advisorplatform.feedback.github;

import cn.edu.cqut.advisorplatform.feedback.config.GitHubProperties;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class GitHubClient {

  private final GitHubProperties properties;

  public GitHubIssueResponse createIssue(String title, String body) {
    return restClient()
        .post()
        .uri(repoPath("/issues"))
        .body(Map.of("title", title, "body", body))
        .retrieve()
        .body(GitHubIssueResponse.class);
  }

  public GitHubIssueResponse getIssue(Long issueNumber) {
    return restClient()
        .get()
        .uri(repoPath("/issues/" + issueNumber))
        .retrieve()
        .body(GitHubIssueResponse.class);
  }

  public GitHubCommentResponse createComment(Long issueNumber, String body) {
    return restClient()
        .post()
        .uri(repoPath("/issues/" + issueNumber + "/comments"))
        .body(Map.of("body", body))
        .retrieve()
        .body(GitHubCommentResponse.class);
  }

  public GitHubIssueResponse closeIssue(Long issueNumber) {
    return restClient()
        .patch()
        .uri(repoPath("/issues/" + issueNumber))
        .body(Map.of("state", "closed"))
        .retrieve()
        .body(GitHubIssueResponse.class);
  }

  public boolean isConfigured() {
    return hasText(properties.getToken())
        && hasText(properties.getOwner())
        && hasText(properties.getRepo())
        && hasText(properties.getApiBaseUrl());
  }

  private RestClient restClient() {
    return RestClient.builder()
        .baseUrl(properties.getApiBaseUrl())
        .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getToken())
        .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
        .build();
  }

  private String repoPath(String suffix) {
    return "/repos/" + properties.getOwner() + "/" + properties.getRepo() + suffix;
  }

  private boolean hasText(String text) {
    return text != null && !text.isBlank();
  }
}
