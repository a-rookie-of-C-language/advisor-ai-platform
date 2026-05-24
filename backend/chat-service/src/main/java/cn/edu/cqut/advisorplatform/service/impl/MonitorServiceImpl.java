package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dto.response.MonitorMetricCardDTO;
import cn.edu.cqut.advisorplatform.dto.response.MonitorRealtimeResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MonitorSeriesDTO;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import cn.edu.cqut.advisorplatform.service.impl.monitor.PrometheusQueryClient;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MonitorServiceImpl implements MonitorService {

  private final PrometheusQueryClient prometheusQueryClient;

  public MonitorServiceImpl(
      @Value("${advisor.monitor.prometheus.base-url:http://127.0.0.1:9090}")
          String prometheusBaseUrl,
      @Value("${advisor.monitor.prometheus.timeout-ms:5000}") long timeoutMs) {
    this.prometheusQueryClient =
        new PrometheusQueryClient(prometheusBaseUrl, Math.max(timeoutMs, 1000));
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

    double availability = prometheusQueryClient.instant(prometheusQueryClient.queryAvailability());
    double qps = prometheusQueryClient.instant("sum(rate(http_server_requests_seconds_count[1m]))");
    double p95 =
        prometheusQueryClient.instant(
            "histogram_quantile(0.95, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))");
    double p99 =
        prometheusQueryClient.instant(
            "histogram_quantile(0.99, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))");
    double errorRate =
        prometheusQueryClient.instant(
            "(sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])) / "
                + "clamp_min(sum(rate(http_server_requests_seconds_count[5m])), 1)) * 100");
    double heapUsed = prometheusQueryClient.instant("sum(jvm_memory_used_bytes{area=\"heap\"})");
    double heapMax = prometheusQueryClient.instant("sum(jvm_memory_max_bytes{area=\"heap\"})");
    double gcRate = prometheusQueryClient.instant("sum(rate(jvm_gc_pause_seconds_count[5m]))");
    double cpu =
        prometheusQueryClient.instant(
            "(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100");
    double mem =
        prometheusQueryClient.instant(
            "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100");
    double disk =
        prometheusQueryClient.instant(
            "(1 - (node_filesystem_avail_bytes{fstype!~\"tmpfs|overlay\"} / "
                + "node_filesystem_size_bytes{fstype!~\"tmpfs|overlay\"})) * 100");

    List<MonitorMetricCardDTO> cards =
        List.of(
            card("availability", "服务可用率", availability, "%"),
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
      alerts.add("服务可用率低于99%，请检查目标服务实例状态");
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
    return new MonitorSeriesDTO(
        key, name, prometheusQueryClient.range(query, start, end, stepSeconds), unit);
  }

  private double percent(double used, double max) {
    if (max <= 0) {
      return 0D;
    }
    return (used / max) * 100D;
  }

  private double round(double value) {
    return Math.round(value * 100.0) / 100.0;
  }
}
