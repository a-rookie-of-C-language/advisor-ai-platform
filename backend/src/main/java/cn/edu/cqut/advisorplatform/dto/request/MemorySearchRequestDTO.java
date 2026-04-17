package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemorySearchRequestDTO {

    @NotNull
    private Long userId;

    @NotNull
    private Long kbId;

    private String query = "";

    @Min(1)
    @Max(50)
    private Integer topK = 6;
}
