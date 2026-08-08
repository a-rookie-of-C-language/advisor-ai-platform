package cn.edu.cqut.advisorplatform.gateway.filter.risk;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

public class RiskInputMetricsSupport {

  private final MeterRegistry meterRegistry;
  private final RiskControlPathPolicy pathPolicy;

  public RiskInputMetricsSupport(MeterRegistry meterRegistry, RiskControlPathPolicy pathPolicy) {
    this.meterRegistry = meterRegistry;
    this.pathPolicy = pathPolicy;
  }

  public void recordPass(String path) {
    Counter.builder("gateway.risk.input.pass")
        .tag("path", pathPolicy.normalizePathTag(path))
        .register(meterRegistry)
        .increment();
  }

  public void recordBlock(String path, RiskCheckResponse response) {
    Counter.builder("gateway.risk.input.block")
        .tag("path", pathPolicy.normalizePathTag(path))
        .tag("category", pathPolicy.safeTag(response.getCategory()))
        .tag("action", pathPolicy.safeTag(response.getAction()))
        .register(meterRegistry)
        .increment();
  }

  public void recordError(String path, boolean failClosed) {
    Counter.builder("gateway.risk.input.error")
        .tag("path", pathPolicy.normalizePathTag(path))
        .tag("mode", failClosed ? "fail_closed" : "fail_open")
        .register(meterRegistry)
        .increment();
  }
}
