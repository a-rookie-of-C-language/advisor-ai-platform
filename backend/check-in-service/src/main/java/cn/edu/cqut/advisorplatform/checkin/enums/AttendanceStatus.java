package cn.edu.cqut.advisorplatform.checkin.enums;

public enum AttendanceStatus {
  NORMAL("NORMAL", "正常"),
  LATE("LATE", "迟到"),
  ABSENT("ABSENT", "缺勤"),
  LEAVE_EARLY("LEAVE_EARLY", "早退"),
  LEAVE("LEAVE", "请假");

  private final String code;
  private final String description;

  AttendanceStatus(String code, String description) {
    this.code = code;
    this.description = description;
  }

  public String getCode() {
    return code;
  }

  public String getDescription() {
    return description;
  }
}
