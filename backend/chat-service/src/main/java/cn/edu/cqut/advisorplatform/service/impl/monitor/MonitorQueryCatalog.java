package cn.edu.cqut.advisorplatform.service.impl.monitor;

class MonitorQueryCatalog {

  static final String QPS = "sum(rate(http_server_requests_seconds_count[1m]))";
  static final String P95_SECONDS =
      "histogram_quantile(0.95, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))";
  static final String P99_SECONDS =
      "histogram_quantile(0.99, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))";
  static final String ERROR_RATE =
      "(sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])) / "
          + "clamp_min(sum(rate(http_server_requests_seconds_count[5m])), 1)) * 100";
  static final String HEAP_USED = "sum(jvm_memory_used_bytes{area=\"heap\"})";
  static final String HEAP_MAX = "sum(jvm_memory_max_bytes{area=\"heap\"})";
  static final String GC_RATE = "sum(rate(jvm_gc_pause_seconds_count[5m]))";
  static final String CPU_USAGE =
      "(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m]))) * 100";
  static final String MEMORY_USAGE =
      "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100";
  static final String DISK_USAGE =
      "(1 - (node_filesystem_avail_bytes{fstype!~\"tmpfs|overlay\"} / "
          + "node_filesystem_size_bytes{fstype!~\"tmpfs|overlay\"})) * 100";
  static final String JVM_HEAP_USAGE =
      "(sum(jvm_memory_used_bytes{area=\"heap\"}) / "
          + "clamp_min(sum(jvm_memory_max_bytes{area=\"heap\"}),1)) * 100";
  static final String P95_MILLIS = P95_SECONDS + " * 1000";

  private MonitorQueryCatalog() {}
}
