package cn.edu.cqut.advisorplatform.checkin.record.entity;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInException {

  private Long id;

  private Long studentId;

  private String checkInId;

  private String exceptionType;

  private String status;

  private Long handlerId;

  private String handlerNote;

  private LocalDateTime handledAt;

  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;
}
