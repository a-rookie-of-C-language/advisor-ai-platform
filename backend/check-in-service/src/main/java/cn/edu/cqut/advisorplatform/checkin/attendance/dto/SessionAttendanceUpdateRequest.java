package cn.edu.cqut.advisorplatform.checkin.attendance.dto;

import java.util.List;
import lombok.Data;

@Data
public class SessionAttendanceUpdateRequest {
  private List<AttendanceMarkRequest> marks;
}
