package cn.edu.cqut.advisorplatform.dto.request;

import lombok.Data;

import java.util.Map;

@Data
public class MemoryCandidateItemDTO {

    private String content;
    private Double confidence;
    private String sourceTurnId;
    private Map<String, Object> tags;
}
