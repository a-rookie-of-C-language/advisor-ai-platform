package cn.edu.cqut.advisorplatform.checkin.record.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInTodayRecords {
    private Long studentId;
    private LocalDate checkDate;
    private Boolean checkedIn;
    private LocalDateTime checkTime;
}
