package cn.edu.cqut.advisorplatform.dto.request;

import java.util.Map;
import lombok.Data;
import org.springframework.lang.Nullable;

@Data
public class MemoryCandidateItemDTO {

  @Nullable private String content;
  @Nullable private Double confidence;
  @Nullable private String sourceTurnId;
  @Nullable private Map<String, Object> tags;
}
