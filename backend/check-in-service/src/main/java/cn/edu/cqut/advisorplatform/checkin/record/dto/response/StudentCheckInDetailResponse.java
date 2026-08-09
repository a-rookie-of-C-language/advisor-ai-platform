package cn.edu.cqut.advisorplatform.checkin.record.dto.response;

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
}
