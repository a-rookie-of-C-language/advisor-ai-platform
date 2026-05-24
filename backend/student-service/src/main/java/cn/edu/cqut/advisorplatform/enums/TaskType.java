package cn.edu.cqut.advisorplatform.enums;

public enum TaskType {
  INFO_MISSING("INFO_MISSING", "信息缺失");

  private final String code;
  private final String description;

  TaskType(String code, String description) {
    this.code = code;
    this.description = description;
  }

  public String getCode() {
    return code;
  }

  public String getDescription() {
    return description;
  }

  public static TaskType fromCode(String code) {
    for (TaskType type : values()) {
      if (type.code.equals(code)) {
        return type;
      }
    }
    return INFO_MISSING;
  }
}
