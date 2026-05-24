package cn.edu.cqut.advisorplatform.enums;

public enum InfoCompleteness {
  COMPLETE(0, "完整"),
  PARTIAL_MISSING(1, "部分缺失"),
  SEVERE_MISSING(2, "严重缺失");

  private final int code;
  private final String description;

  InfoCompleteness(int code, String description) {
    this.code = code;
    this.description = description;
  }

  public int getCode() {
    return code;
  }

  public String getDescription() {
    return description;
  }

  public static InfoCompleteness fromCode(int code) {
    for (InfoCompleteness type : values()) {
      if (type.code == code) {
        return type;
      }
    }
    return COMPLETE;
  }
}
