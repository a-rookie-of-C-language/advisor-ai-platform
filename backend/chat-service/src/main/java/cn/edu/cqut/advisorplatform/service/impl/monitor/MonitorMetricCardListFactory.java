package cn.edu.cqut.advisorplatform.service.impl.monitor;

import cn.edu.cqut.advisorplatform.dto.response.monitor.MonitorMetricCardDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
class MonitorMetricCardListFactory {

  private final MonitorMetricCardFactory cardFactory;

  List<MonitorMetricCardDTO> build(MonitorInstantMetrics metrics) {
    return List.of(
        cardFactory.card("availability", "服务可用率", metrics.availability(), "%"),
        cardFactory.card("qps", "请求QPS", metrics.qps(), "req/s"),
        cardFactory.card("p95", "P95延迟", metrics.p95() * 1000, "ms"),
        cardFactory.card("p99", "P99延迟", metrics.p99() * 1000, "ms"),
        cardFactory.card("error_rate", "5xx错误率", metrics.errorRate(), "%"),
        cardFactory.card(
            "jvm_heap", "JVM堆使用率", cardFactory.percent(metrics.heapUsed(), metrics.heapMax()), "%"),
        cardFactory.card("gc_rate", "GC频率", metrics.gcRate(), "count/s"),
        cardFactory.card("cpu_usage", "CPU使用率", metrics.cpu(), "%"),
        cardFactory.card("memory_usage", "内存使用率", metrics.memory(), "%"),
        cardFactory.card("disk_usage", "磁盘使用率", metrics.disk(), "%"));
  }
}
