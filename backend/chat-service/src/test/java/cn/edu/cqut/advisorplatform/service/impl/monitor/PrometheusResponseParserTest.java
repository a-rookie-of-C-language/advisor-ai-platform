package cn.edu.cqut.advisorplatform.service.impl.monitor;

import static org.assertj.core.api.Assertions.assertThat;

import cn.edu.cqut.advisorplatform.dto.response.monitor.MonitorPointDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class PrometheusResponseParserTest {

  private final PrometheusResponseParser parser = new PrometheusResponseParser(new ObjectMapper());

  @Test
  void instantValue_shouldSumVectorValues() throws Exception {
    String body =
        """
        {"data":{"result":[{"value":[1,"2.5"]},{"value":[1,"3.25"]}]}}
        """;

    assertThat(parser.instantValue(body)).isEqualTo(5.75);
  }

  @Test
  void rangePoints_shouldMapFirstSeriesValues() throws Exception {
    String body =
        """
        {"data":{"result":[{"values":[[10,"1.234"],[20,"2.345"]]}]}}
        """;

    List<MonitorPointDTO> points = parser.rangePoints(body);

    assertThat(points).hasSize(2);
    assertThat(points.get(0).getTs()).isEqualTo(10000L);
    assertThat(points.get(0).getValue()).isEqualTo(1.23);
    assertThat(points.get(1).getTs()).isEqualTo(20000L);
    assertThat(points.get(1).getValue()).isEqualTo(2.35);
  }
}
