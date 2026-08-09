package cn.edu.cqut.advisorplatform.entity.chat;

import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class StreamEventRecord {
  private String event;
  private String source;
  private String traceId;
  private Long timestamp;
  private Map<String, Object> payload;
}
