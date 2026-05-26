package cn.edu.cqut.advisorplatform.gateway.filter;

class RiskResponseBodyFactory {

  String normalBlockedBody() {
    return "{\"code\":451,\"message\":\"鍐呭涓嶅悎瑙勶紝宸茶杩囨护\"}";
  }

  String sseBlockedEvent(String category) {
    return "event: risk_alert\ndata: "
        + "{\"code\":451,\"message\":\"鍐呭涓嶅悎瑙勶紝宸茶杩囨护\","
        + "\"category\":\""
        + safeTag(category)
        + "\"}\n\n"
        + "event: done\ndata: {\"message\":\"stream_stopped_by_risk\"}\n\n";
  }

  String safeTag(String value) {
    return value == null || value.isBlank() ? "unknown" : value;
  }
}
