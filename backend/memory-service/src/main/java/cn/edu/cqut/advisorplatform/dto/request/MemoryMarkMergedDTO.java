package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemoryMarkMergedDTO {

  @NotNull private Long targetMemoryId;
}
