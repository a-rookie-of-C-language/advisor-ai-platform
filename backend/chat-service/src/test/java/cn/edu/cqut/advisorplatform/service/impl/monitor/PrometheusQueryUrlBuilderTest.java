package cn.edu.cqut.advisorplatform.service.impl.monitor;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PrometheusQueryUrlBuilderTest {

  @Test
  void instantUrl_shouldTrimTrailingSlashAndEncodeQuery() {
    PrometheusQueryUrlBuilder builder = new PrometheusQueryUrlBuilder("http://prometheus/");

    assertThat(builder.instantUrl("sum(rate(http_requests_total[1m]))"))
        .isEqualTo(
            "http://prometheus/api/v1/query?query=sum%28rate%28http_requests_total%5B1m%5D%29%29");
  }

  @Test
  void rangeUrl_shouldAppendRangeParameters() {
    PrometheusQueryUrlBuilder builder = new PrometheusQueryUrlBuilder("http://prometheus");

    assertThat(builder.rangeUrl("up", 10, 70, 15))
        .isEqualTo("http://prometheus/api/v1/query_range?query=up&start=10&end=70&step=15");
  }
}
