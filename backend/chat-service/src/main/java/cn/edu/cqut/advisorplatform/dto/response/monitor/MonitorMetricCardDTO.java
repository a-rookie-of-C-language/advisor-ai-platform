package cn.edu.cqut.advisorplatform.dto.response.monitor;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonitorMetricCardDTO {
  private String key;
  private String name;
  private double value;
  private String unit;
  private String status;
}
