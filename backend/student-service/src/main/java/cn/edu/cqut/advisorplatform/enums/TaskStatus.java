package cn.edu.cqut.advisorplatform.enums;

public enum TaskStatus {
  PENDING(0, "待处理"),
  PROCESSING(1, "处理中"),
  COMPLETED(2, "已完成"),
  CLOSED(3, "已关闭");

  private final int code;
  private final String description;

  TaskStatus(int code, String description) {
    this.code = code;
    this.description = description;
  }

  public int getCode() {
    return code;
  }

  public String getDescription() {
    return description;
  }

  public static TaskStatus fromCode(int code) {
    for (TaskStatus status : values()) {
      if (status.code == code) {
        return status;
      }
    }
    return PENDING;
  }
}
