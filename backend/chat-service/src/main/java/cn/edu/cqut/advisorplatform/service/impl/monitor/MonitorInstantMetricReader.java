package cn.edu.cqut.advisorplatform.service.impl.monitor;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
class MonitorInstantMetricReader {

  private final PrometheusQueryClient prometheusQueryClient;

  MonitorInstantMetrics read() {
    return new MonitorInstantMetrics(
        prometheusQueryClient.instant(prometheusQueryClient.queryAvailability()),
        prometheusQueryClient.instant(MonitorQueryCatalog.QPS),
        prometheusQueryClient.instant(MonitorQueryCatalog.P95_SECONDS),
        prometheusQueryClient.instant(MonitorQueryCatalog.P99_SECONDS),
        prometheusQueryClient.instant(MonitorQueryCatalog.ERROR_RATE),
        prometheusQueryClient.instant(MonitorQueryCatalog.HEAP_USED),
        prometheusQueryClient.instant(MonitorQueryCatalog.HEAP_MAX),
        prometheusQueryClient.instant(MonitorQueryCatalog.GC_RATE),
        prometheusQueryClient.instant(MonitorQueryCatalog.CPU_USAGE),
        prometheusQueryClient.instant(MonitorQueryCatalog.MEMORY_USAGE),
        prometheusQueryClient.instant(MonitorQueryCatalog.DISK_USAGE));
  }
}
