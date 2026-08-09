package cn.edu.cqut.advisorplatform.gateway.filter.risk;

class RiskResponseRequestFactory {

  RiskCheckRequest outputRequest(String userId, String path, String content) {
    RiskCheckRequest request = new RiskCheckRequest();
    request.setUserId(parseUserId(userId));
    request.setIpAddress("internal");
    request.setRequestPath(path);
    request.setContent(content);
    request.setDirection("OUTPUT");
    return request;
  }

  private Long parseUserId(String userId) {
    if (userId == null || userId.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(userId);
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
