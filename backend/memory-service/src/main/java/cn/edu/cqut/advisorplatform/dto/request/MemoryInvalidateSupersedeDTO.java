package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemoryInvalidateSupersedeDTO {

  @NotNull private Long newMemoryId;
}
