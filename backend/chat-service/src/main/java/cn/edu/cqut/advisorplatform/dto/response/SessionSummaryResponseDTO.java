package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.SessionSummaryDO;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SessionSummaryResponseDTO {

    private Long sessionId;
    private String summary;
    private LocalDateTime updatedAt;

    public static SessionSummaryResponseDTO from(SessionSummaryDO entity) {
        return new SessionSummaryResponseDTO(
                entity.getSession().getId(),
                entity.getSummary(),
                entity.getUpdatedAt()
        );
    }
}
