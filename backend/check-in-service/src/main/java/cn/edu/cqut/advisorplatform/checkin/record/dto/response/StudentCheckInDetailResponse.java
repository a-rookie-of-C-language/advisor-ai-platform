package cn.edu.cqut.advisorplatform.checkin.record.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public class StudentCheckInDetailResponse {

  private StudentCheckInSummaryResponse summary;
  private List<CheckInRecordItem> recentRecords;

  public StudentCheckInSummaryResponse getSummary() {
    return summary;
  }

  public void setSummary(StudentCheckInSummaryResponse summary) {
    this.summary = summary;
  }

  public List<CheckInRecordItem> getRecentRecords() {
    return recentRecords;
  }

  public void setRecentRecords(List<CheckInRecordItem> recentRecords) {
    this.recentRecords = recentRecords;
  }

  public static class CheckInRecordItem {
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
}
