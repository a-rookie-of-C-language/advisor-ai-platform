package cn.edu.cqut.advisorplatform.service.impl.monitor;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dto.response.monitor.MonitorRealtimeResponseDTO;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class MonitorMetricSupport {

  private final MonitorInstantMetricReader instantMetricReader;
  private final MonitorMetricCardListFactory cardListFactory;
  private final MonitorSeriesFactory seriesFactory;
  private final MonitorAlertFactory alertFactory;

  public MonitorMetricSupport(PrometheusQueryClient prometheusQueryClient) {
    this.instantMetricReader = new MonitorInstantMetricReader(prometheusQueryClient);
    this.cardListFactory = new MonitorMetricCardListFactory(new MonitorMetricCardFactory());
    this.seriesFactory = new MonitorSeriesFactory(prometheusQueryClient);
    this.alertFactory = new MonitorAlertFactory();
  }

  public MonitorRealtimeResponseDTO getRealtimeMetrics(int minutes, int stepSeconds) {
    if (minutes < 1 || minutes > 120) {
      throw new BadRequestException("minutes must be between 1 and 120");
    }
    if (stepSeconds < 5 || stepSeconds > 300) {
      throw new BadRequestException("stepSeconds must be between 5 and 300");
    }

    long now = Instant.now().getEpochSecond();
    long start = now - minutes * 60L;

    MonitorInstantMetrics instantMetrics = instantMetricReader.read();

    var cards = cardListFactory.build(instantMetrics);
    var series = seriesFactory.build(start, now, stepSeconds);

    var alerts =
        alertFactory.alerts(
            instantMetrics.availability(), instantMetrics.errorRate(), instantMetrics.p99());
    return new MonitorRealtimeResponseDTO(
        now * 1000, Math.max(stepSeconds, 5), cards, series, alerts);
  }
}
