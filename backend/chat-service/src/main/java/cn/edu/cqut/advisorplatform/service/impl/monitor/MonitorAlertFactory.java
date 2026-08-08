package cn.edu.cqut.advisorplatform.service.impl.monitor;

import java.util.ArrayList;
import java.util.List;

class MonitorAlertFactory {

  List<String> alerts(double availability, double errorRate, double p99Seconds) {
    List<String> alerts = new ArrayList<>();
    if (availability < 99) {
      alerts.add("服务可用率低于99%，请检查目标服务实例状态");
    }
    if (errorRate >= 2) {
      alerts.add("5xx错误率超过2%，请检查最近发布或下游依赖");
    }
    if (p99Seconds * 1000 >= 2000) {
      alerts.add("P99延迟超过2秒，建议关注网关与核心接口热区");
    }
    return alerts;
  }
}
