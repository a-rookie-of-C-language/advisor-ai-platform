package cn.edu.cqut.advisorplatform.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonitorSeriesDTO {
  private String key;
  private String name;
  private List<MonitorPointDTO> points;
  private String unit;
}
