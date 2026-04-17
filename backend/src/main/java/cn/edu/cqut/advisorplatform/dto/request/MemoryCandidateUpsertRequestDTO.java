package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class MemoryCandidateUpsertRequestDTO {

    @NotNull
    private Long userId;

    @NotNull
    private Long kbId;

    private List<MemoryCandidateItemDTO> candidates;
}
