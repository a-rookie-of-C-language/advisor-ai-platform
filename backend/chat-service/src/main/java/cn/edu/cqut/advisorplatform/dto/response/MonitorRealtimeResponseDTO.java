package cn.edu.cqut.advisorplatform.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonitorRealtimeResponseDTO {
  private long generatedAt;
  private int refreshSeconds;
  private List<MonitorMetricCardDTO> cards;
  private List<MonitorSeriesDTO> series;
  private List<String> alerts;
}
