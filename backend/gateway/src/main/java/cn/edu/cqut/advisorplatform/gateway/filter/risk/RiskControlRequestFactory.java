package cn.edu.cqut.advisorplatform.gateway.filter.risk;

class RiskControlRequestFactory {

  RiskCheckRequest inputRequest(
      String userId, String sessionId, String ipAddress, String path, String requestBody) {
    RiskCheckRequest request = new RiskCheckRequest();
    request.setUserId(parseUserId(userId));
    request.setSessionId(sessionId);
    request.setIpAddress(ipAddress);
    request.setRequestPath(path);
    request.setRequestBody(requestBody);
    request.setContent(requestBody);
    request.setDirection("INPUT");
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
