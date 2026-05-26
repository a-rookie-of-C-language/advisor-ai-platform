package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.response.MonitorSeriesDTO;
import cn.edu.cqut.advisorplatform.service.impl.monitor.PrometheusQueryClient;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
class MonitorSeriesFactory {

  private final PrometheusQueryClient prometheusQueryClient;

  List<MonitorSeriesDTO> build(long start, long end, int stepSeconds) {
    return List.of(
        rangeSeries("qps", "请求QPS", MonitorQueryCatalog.QPS, start, end, stepSeconds, "req/s"),
        rangeSeries(
            "error_rate", "5xx错误率", MonitorQueryCatalog.ERROR_RATE, start, end, stepSeconds, "%"),
        rangeSeries("p95", "P95延迟", MonitorQueryCatalog.P95_MILLIS, start, end, stepSeconds, "ms"),
        rangeSeries(
            "cpu_usage", "CPU使用率", MonitorQueryCatalog.CPU_USAGE, start, end, stepSeconds, "%"),
        rangeSeries(
            "memory_usage",
            "内存使用率",
            MonitorQueryCatalog.MEMORY_USAGE,
            start,
            end,
            stepSeconds,
            "%"),
        rangeSeries(
            "jvm_heap",
            "JVM堆使用率",
            MonitorQueryCatalog.JVM_HEAP_USAGE,
            start,
            end,
            stepSeconds,
            "%"));
  }

  private MonitorSeriesDTO rangeSeries(
      String key, String name, String query, long start, long end, int stepSeconds, String unit) {
    return new MonitorSeriesDTO(
        key, name, prometheusQueryClient.range(query, start, end, stepSeconds), unit);
  }
}
