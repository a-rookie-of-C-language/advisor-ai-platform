package cn.edu.cqut.advisorplatform.dto.request;

import lombok.Data;
import org.springframework.lang.Nullable;

import java.util.Map;

@Data
public class MemoryCandidateItemDTO {

    @Nullable
    private String content;
    @Nullable
    private Double confidence;
    @Nullable
    private String sourceTurnId;
    @Nullable
    private Map<String, Object> tags;
}
