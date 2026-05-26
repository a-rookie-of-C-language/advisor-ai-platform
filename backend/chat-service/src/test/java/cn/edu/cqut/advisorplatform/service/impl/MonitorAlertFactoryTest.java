package cn.edu.cqut.advisorplatform.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class MonitorAlertFactoryTest {

  private final MonitorAlertFactory factory = new MonitorAlertFactory();

  @Test
  void alerts_shouldReturnEmptyWhenMetricsAreHealthy() {
    assertThat(factory.alerts(99.9, 0.5, 1.2)).isEmpty();
  }

  @Test
  void alerts_shouldReturnTriggeredAlertMessages() {
    List<String> alerts = factory.alerts(98.5, 2.1, 2.0);

    assertThat(alerts)
        .containsExactly(
            "服务可用率低于99%，请检查目标服务实例状态", "5xx错误率超过2%，请检查最近发布或下游依赖", "P99延迟超过2秒，建议关注网关与核心接口热区");
  }
}
