package cn.edu.cqut.advisorplatform.service.impl.monitor;

import cn.edu.cqut.advisorplatform.dto.response.MonitorPointDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PrometheusQueryClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final PrometheusResponseParser responseParser =
      new PrometheusResponseParser(objectMapper);
  private final PrometheusQueryUrlBuilder urlBuilder;

  public PrometheusQueryClient(
      @Value("${advisor.monitor.prometheus.base-url}") String prometheusBaseUrl,
      @Value("${advisor.monitor.prometheus.timeout-ms}") long timeoutMs) {
    this.urlBuilder = new PrometheusQueryUrlBuilder(prometheusBaseUrl);
    this.httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(Math.max(timeoutMs, 1000)))
            .build();
  }

  public String queryAvailability() {
    return "avg(up{job=~\"chat-service|auth-service|audit-service|memory-service|rag-service|gateway\"}) * 100";
  }

  public double instant(String query) {
    try {
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(urlBuilder.instantUrl(query)))
              .GET()
              .timeout(Duration.ofSeconds(8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        log.warn(
            "prometheus instant query failed, status={}, query={}", response.statusCode(), query);
        return 0D;
      }
      return responseParser.instantValue(response.body());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("prometheus instant query interrupted: {}", e.getMessage());
      return 0D;
    } catch (IOException e) {
      log.warn("prometheus instant query error: {}", e.getMessage());
      return 0D;
    }
  }

  public List<MonitorPointDTO> range(String query, long start, long end, int stepSeconds) {
    try {
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(urlBuilder.rangeUrl(query, start, end, stepSeconds)))
              .GET()
              .timeout(Duration.ofSeconds(8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        log.warn(
            "prometheus range query failed, status={}, query={}", response.statusCode(), query);
        return List.of();
      }
      return responseParser.rangePoints(response.body());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("prometheus range query interrupted: {}", e.getMessage());
      return List.of();
    } catch (IOException e) {
      log.warn("prometheus range query error: {}", e.getMessage());
      return List.of();
    }
  }
}
