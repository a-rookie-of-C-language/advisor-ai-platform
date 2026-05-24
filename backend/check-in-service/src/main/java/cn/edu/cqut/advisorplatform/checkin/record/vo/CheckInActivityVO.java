package cn.edu.cqut.advisorplatform.checkin.record.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class CheckInActivityVO {
  private String checkInId;
  private Long courseId;
  private String courseName;
  private String title;
  private String teacherNo;
  private List<String> classCodes;
  private String status;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime startTime;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime endTime;
}
