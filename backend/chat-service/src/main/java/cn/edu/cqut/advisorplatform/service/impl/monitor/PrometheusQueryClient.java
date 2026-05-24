package cn.edu.cqut.advisorplatform.service.impl.monitor;

import cn.edu.cqut.advisorplatform.dto.response.MonitorPointDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PrometheusQueryClient {

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final String prometheusBaseUrl;

  public PrometheusQueryClient(String prometheusBaseUrl, long timeoutMs) {
    this.prometheusBaseUrl =
        prometheusBaseUrl.endsWith("/")
            ? prometheusBaseUrl.substring(0, prometheusBaseUrl.length() - 1)
            : prometheusBaseUrl;
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
      String url = prometheusBaseUrl + "/api/v1/query?query=" + encode(query);
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(url))
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
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode result = root.path("data").path("result");
      if (!result.isArray() || result.isEmpty()) {
        return 0D;
      }
      double sum = 0D;
      for (JsonNode item : result) {
        JsonNode value = item.path("value");
        if (value.isArray() && value.size() >= 2) {
          sum += parseDouble(value.get(1).asText("0"));
        }
      }
      return sum;
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
    List<MonitorPointDTO> points = new ArrayList<>();
    try {
      String url =
          prometheusBaseUrl
              + "/api/v1/query_range?query="
              + encode(query)
              + "&start="
              + start
              + "&end="
              + end
              + "&step="
              + stepSeconds;
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(url))
              .GET()
              .timeout(Duration.ofSeconds(8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        log.warn(
            "prometheus range query failed, status={}, query={}", response.statusCode(), query);
        return points;
      }
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode result = root.path("data").path("result");
      if (!result.isArray() || result.isEmpty()) {
        return points;
      }
      JsonNode values = result.get(0).path("values");
      if (!values.isArray()) {
        return points;
      }
      for (JsonNode item : values) {
        if (item.isArray() && item.size() >= 2) {
          long timestamp = item.get(0).asLong() * 1000L;
          double value = parseDouble(item.get(1).asText("0"));
          points.add(new MonitorPointDTO(timestamp, round(value)));
        }
      }
      return points;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("prometheus range query interrupted: {}", e.getMessage());
      return points;
    } catch (IOException e) {
      log.warn("prometheus range query error: {}", e.getMessage());
      return points;
    }
  }

  private double parseDouble(String value) {
    try {
      return Double.parseDouble(value);
    } catch (Exception e) {
      return 0D;
    }
  }

  private double round(double value) {
    return Math.round(value * 100.0) / 100.0;
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
