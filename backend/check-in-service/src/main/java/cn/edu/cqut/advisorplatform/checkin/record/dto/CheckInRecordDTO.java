package cn.edu.cqut.advisorplatform.checkin.record.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CheckInRecordDTO {
    private Long studentId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate checkDate;

    private Boolean checkedIn;
}
