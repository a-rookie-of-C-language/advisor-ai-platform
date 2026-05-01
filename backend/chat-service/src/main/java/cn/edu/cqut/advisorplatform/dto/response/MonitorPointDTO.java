package cn.edu.cqut.advisorplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonitorPointDTO {
  private long ts;
  private double value;
}
