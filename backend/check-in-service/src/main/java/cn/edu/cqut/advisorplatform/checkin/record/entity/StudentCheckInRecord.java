package cn.edu.cqut.advisorplatform.checkin.record.entity;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCheckInRecord {

    private Long id;

    private Long studentId;

    private LocalDate checkDate;

    private Boolean checkedIn;

    private LocalDateTime checkTime;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

}
