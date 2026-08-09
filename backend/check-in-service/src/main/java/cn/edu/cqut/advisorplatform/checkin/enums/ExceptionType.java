package cn.edu.cqut.advisorplatform.checkin.enums;

public enum ExceptionType {
  LATE("LATE", "迟到"),
  ABSENT("ABSENT", "缺勤"),
  LEAVE_EARLY("LEAVE_EARLY", "早退");

  private final String code;
  private final String description;

  ExceptionType(String code, String description) {
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
