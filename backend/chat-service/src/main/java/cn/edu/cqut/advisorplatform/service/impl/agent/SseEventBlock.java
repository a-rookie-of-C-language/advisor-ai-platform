package cn.edu.cqut.advisorplatform.service.impl.agent;

record SseEventBlock(String eventName, String dataJson) {

  static SseEventBlock parse(String sseBlock) {
    String[] lines = sseBlock.split("\n");
    String eventName = "message";
    StringBuilder dataBuilder = new StringBuilder();
    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.startsWith("event:")) {
        eventName = trimmed.substring(6).trim();
      } else if (trimmed.startsWith("data:")) {
        dataBuilder.append(trimmed.substring(5).trim());
      }
    }
    return new SseEventBlock(eventName, dataBuilder.toString());
  }
}
