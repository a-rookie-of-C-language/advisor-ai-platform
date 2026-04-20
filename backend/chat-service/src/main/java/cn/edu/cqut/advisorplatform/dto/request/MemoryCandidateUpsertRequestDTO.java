package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.lang.Nullable;

import java.util.List;

@Data
public class MemoryCandidateUpsertRequestDTO {

    @NotNull
    private Long userId;

    @NotNull
    private Long kbId;

    @Nullable
    private List<MemoryCandidateItemDTO> candidates;
}
