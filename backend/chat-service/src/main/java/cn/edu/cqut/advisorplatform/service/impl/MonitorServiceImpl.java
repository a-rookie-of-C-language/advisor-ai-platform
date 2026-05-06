package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dto.response.MonitorMetricCardDTO;
import cn.edu.cqut.advisorplatform.dto.response.MonitorPointDTO;
import cn.edu.cqut.advisorplatform.dto.response.MonitorRealtimeResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MonitorSeriesDTO;
import cn.edu.cqut.advisorplatform.service.MonitorService;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MonitorServiceImpl implements MonitorService {
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final String prometheusBaseUrl;

  public MonitorServiceImpl(
      @Value("${advisor.monitor.prometheus.base-url:http://127.0.0.1:9090}")
          String prometheusBaseUrl,
      @Value("${advisor.monitor.prometheus.timeout-ms:5000}") long timeoutMs,
      ObjectMapper objectMapper) {
    this.prometheusBaseUrl =
        prometheusBaseUrl.endsWith("/")
            ? prometheusBaseUrl.substring(0, prometheusBaseUrl.length() - 1)
            : prometheusBaseUrl;
    this.httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(Math.max(timeoutMs, 1000)))
            .build();
    this.objectMapper = objectMapper;
  }

  @Override
  public MonitorRealtimeResponseDTO getRealtimeMetrics(int minutes, int stepSeconds) {
    if (minutes < 1 || minutes > 120) {
      throw new BadRequestException("minutes must be between 1 and 120");
    }
    if (stepSeconds < 5 || stepSeconds > 300) {
      throw new BadRequestException("stepSeconds must be between 5 and 300");
    }

    long now = Instant.now().getEpochSecond();
    long start = now - minutes * 60L;

    double availability = instant(queryAvailability());
    double qps = instant("sum(rate(http_server_requests_seconds_count[1m]))");
    double p95 =
        instant(
            "histogram_quantile(0.95, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))");
    double p99 =
        instant(
            "histogram_quantile(0.99, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))");
    double errorRate =
        instant(
            "(sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])) / "
                + "clamp_min(sum(rate(http_server_requests_seconds_count[5m])), 1)) * 100");
    double heapUsed = instant("sum(jvm_memory_used_bytes{area=\"heap\"})");
    double heapMax = instant("sum(jvm_memory_max_bytes{area=\"heap\"})");
    double gcRate = instant("sum(rate(jvm_gc_pause_seconds_count[5m]))");
    double cpu = instant("(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100");
    double mem =
        instant("(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100");
    double disk =
        instant(
            "(1 - (node_filesystem_avail_bytes{fstype!~\"tmpfs|overlay\"} / "
                + "node_filesystem_size_bytes{fstype!~\"tmpfs|overlay\"})) * 100");

    List<MonitorMetricCardDTO> cards =
        List.of(
            card("availability", "服务可用性", availability, "%"),
            card("qps", "请求QPS", qps, "req/s"),
            card("p95", "P95延迟", p95 * 1000, "ms"),
            card("p99", "P99延迟", p99 * 1000, "ms"),
            card("error_rate", "5xx错误率", errorRate, "%"),
            card("jvm_heap", "JVM堆使用率", percent(heapUsed, heapMax), "%"),
            card("gc_rate", "GC频率", gcRate, "count/s"),
            card("cpu_usage", "CPU使用率", cpu, "%"),
            card("memory_usage", "内存使用率", mem, "%"),
            card("disk_usage", "磁盘使用率", disk, "%"));

    List<MonitorSeriesDTO> series =
        List.of(
            rangeSeries(
                "qps",
                "请求QPS",
                "sum(rate(http_server_requests_seconds_count[1m]))",
                start,
                now,
                stepSeconds,
                "req/s"),
            rangeSeries(
                "error_rate",
                "5xx错误率",
                "(sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])) / "
                    + "clamp_min(sum(rate(http_server_requests_seconds_count[5m])), 1)) * 100",
                start,
                now,
                stepSeconds,
                "%"),
            rangeSeries(
                "p95",
                "P95延迟",
                "histogram_quantile(0.95, sum by (le) (rate(http_server_requests_seconds_bucket[5m]))) * 1000",
                start,
                now,
                stepSeconds,
                "ms"),
            rangeSeries(
                "cpu_usage",
                "CPU使用率",
                "(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100",
                start,
                now,
                stepSeconds,
                "%"),
            rangeSeries(
                "memory_usage",
                "内存使用率",
                "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
                start,
                now,
                stepSeconds,
                "%"),
            rangeSeries(
                "jvm_heap",
                "JVM堆使用率",
                "(sum(jvm_memory_used_bytes{area=\"heap\"}) / clamp_min(sum(jvm_memory_max_bytes{area=\"heap\"}),1)) * 100",
                start,
                now,
                stepSeconds,
                "%"));

    List<String> alerts = new ArrayList<>();
    if (availability < 99) {
      alerts.add("服务可用性低于99%，请检查目标服务实例状态");
    }
    if (errorRate >= 2) {
      alerts.add("5xx错误率超过2%，请检查最近发布或下游依赖");
    }
    if (p99 * 1000 >= 2000) {
      alerts.add("P99延迟超过2秒，建议关注网关与核心接口热点");
    }
    return new MonitorRealtimeResponseDTO(
        now * 1000, Math.max(stepSeconds, 5), cards, series, alerts);
  }

  private MonitorMetricCardDTO card(String key, String name, double value, String unit) {
    double rounded = round(value);
    String status = "ok";
    if ("%".equals(unit)) {
      if (rounded >= 90) {
        status = "warn";
      }
      if (rounded >= 98) {
        status = "critical";
      }
      if ("availability".equals(key) || "error_rate".equals(key)) {
        status = rounded < 99 && "availability".equals(key) ? "warn" : status;
        status = rounded >= 2 && "error_rate".equals(key) ? "critical" : status;
        if ("availability".equals(key) && rounded >= 99.5) {
          status = "ok";
        }
        if ("error_rate".equals(key) && rounded < 1) {
          status = "ok";
        }
      }
    }
    return new MonitorMetricCardDTO(key, name, rounded, unit, status);
  }

  private MonitorSeriesDTO rangeSeries(
      String key, String name, String query, long start, long end, int stepSeconds, String unit) {
    return new MonitorSeriesDTO(key, name, range(query, start, end, stepSeconds), unit);
  }

  private String queryAvailability() {
    return "avg(up{job=~\"chat-service|auth-service|audit-service|memory-service|rag-service|gateway\"}) * 100";
  }

  private double instant(String query) {
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

  private List<MonitorPointDTO> range(String query, long start, long end, int stepSeconds) {
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
      if (!result.isArray()) {
        return points;
      }

      // Merge multiple series (instance labels) into one timestamp-aligned aggregate series.
      java.util.Map<Long, Double> merged = new java.util.HashMap<>();
      for (JsonNode item : result) {
        JsonNode values = item.path("values");
        if (!values.isArray()) {
          continue;
        }
        for (JsonNode pair : values) {
          if (!pair.isArray() || pair.size() < 2) {
            continue;
          }
          long ts = pair.get(0).asLong() * 1000;
          double value = parseDouble(pair.get(1).asText("0"));
          merged.put(ts, merged.getOrDefault(ts, 0D) + value);
        }
      }
      merged.entrySet().stream()
          .sorted(Comparator.comparingLong(java.util.Map.Entry::getKey))
          .forEach(
              entry -> points.add(new MonitorPointDTO(entry.getKey(), round(entry.getValue()))));
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

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private double parseDouble(String value) {
    try {
      return Double.parseDouble(value);
    } catch (NumberFormatException e) {
      return 0D;
    }
  }

  private double percent(double numerator, double denominator) {
    if (denominator <= 0) {
      return 0D;
    }
    return (numerator / denominator) * 100D;
  }

  private double round(double value) {
    return Math.round(value * 100D) / 100D;
  }
}
