package cn.edu.cqut.advisorplatform.checkin.record.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class AvailableCheckInActivityVO {
  private String checkInId;
  private Long courseId;
  private String courseName;
  private String title;
  private Boolean checkedIn;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime startTime;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime endTime;
}
