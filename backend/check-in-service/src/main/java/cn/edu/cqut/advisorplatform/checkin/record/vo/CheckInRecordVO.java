package cn.edu.cqut.advisorplatform.checkin.record.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CheckInRecordVO {
    private Long studentId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate checkDate;

    private Boolean checkedIn;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime checkTime;
}
