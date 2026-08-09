package cn.edu.cqut.advisorplatform.dto.response;

import java.time.LocalDateTime;

public class CheckInRecordItem {
  private LocalDateTime checkTime;
  private String checkDate;
  private Boolean checkedIn;

  public LocalDateTime getCheckTime() {
    return checkTime;
  }

  public void setCheckTime(LocalDateTime checkTime) {
    this.checkTime = checkTime;
  }

  public String getCheckDate() {
    return checkDate;
  }

  public void setCheckDate(String checkDate) {
    this.checkDate = checkDate;
  }

  public Boolean getCheckedIn() {
    return checkedIn;
  }

  public void setCheckedIn(Boolean checkedIn) {
    this.checkedIn = checkedIn;
  }
}
