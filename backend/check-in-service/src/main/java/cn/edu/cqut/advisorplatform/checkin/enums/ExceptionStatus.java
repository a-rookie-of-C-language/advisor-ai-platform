package cn.edu.cqut.advisorplatform.checkin.enums;

public enum ExceptionStatus {
  PENDING("PENDING", "待处理"),
  PROCESSING("PROCESSING", "处理中"),
  COMPLETED("COMPLETED", "已完成"),
  CLOSED("CLOSED", "已关闭");

  private final String code;
  private final String description;

  ExceptionStatus(String code, String description) {
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
