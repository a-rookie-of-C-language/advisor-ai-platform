package cn.edu.cqut.advisorplatform.enums;

public enum RiskLevel {
  NORMAL(0, "正常"),
  ATTENTION(1, "关注"),
  WARNING(2, "预警"),
  SEVERE(3, "严重预警");

  private final int code;
  private final String description;

  RiskLevel(int code, String description) {
    this.code = code;
    this.description = description;
  }

  public int getCode() {
    return code;
  }

  public String getDescription() {
    return description;
  }

  public static RiskLevel fromCode(int code) {
    for (RiskLevel level : values()) {
      if (level.code == code) {
        return level;
      }
    }
    return NORMAL;
  }
}
