package cn.edu.cqut.advisorplatform.dto.response;

import java.time.LocalDateTime;

public class StudentCheckInSummaryResponse {

  private Long studentId;
  private String studentNo;
  private String studentName;
  private Long totalCount;
  private Long checkedInCount;
  private Long missedCount;
  private Double checkInRate;
  private LocalDateTime lastCheckInTime;

  public Long getStudentId() {
    return studentId;
  }

  public void setStudentId(Long studentId) {
    this.studentId = studentId;
  }

  public String getStudentNo() {
    return studentNo;
  }

  public void setStudentNo(String studentNo) {
    this.studentNo = studentNo;
  }

  public String getStudentName() {
    return studentName;
  }

  public void setStudentName(String studentName) {
    this.studentName = studentName;
  }

  public Long getTotalCount() {
    return totalCount;
  }

  public void setTotalCount(Long totalCount) {
    this.totalCount = totalCount;
  }

  public Long getCheckedInCount() {
    return checkedInCount;
  }

  public void setCheckedInCount(Long checkedInCount) {
    this.checkedInCount = checkedInCount;
  }

  public Long getMissedCount() {
    return missedCount;
  }

  public void setMissedCount(Long missedCount) {
    this.missedCount = missedCount;
  }

  public Double getCheckInRate() {
    return checkInRate;
  }

  public void setCheckInRate(Double checkInRate) {
    this.checkInRate = checkInRate;
  }

  public LocalDateTime getLastCheckInTime() {
    return lastCheckInTime;
  }

  public void setLastCheckInTime(LocalDateTime lastCheckInTime) {
    this.lastCheckInTime = lastCheckInTime;
  }
}
