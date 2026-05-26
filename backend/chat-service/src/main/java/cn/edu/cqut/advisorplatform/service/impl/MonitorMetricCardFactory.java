package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.response.MonitorMetricCardDTO;

class MonitorMetricCardFactory {

  MonitorMetricCardDTO card(String key, String name, double value, String unit) {
    double rounded = round(value);
    return new MonitorMetricCardDTO(key, name, rounded, unit, status(key, rounded, unit));
  }

  double percent(double used, double max) {
    if (max <= 0) {
      return 0D;
    }
    return (used / max) * 100D;
  }

  private String status(String key, double rounded, String unit) {
    String status = "ok";
    if (!"%".equals(unit)) {
      return status;
    }
    if (rounded >= 90) {
      status = "warn";
    }
    if (rounded >= 98) {
      status = "critical";
    }
    if ("availability".equals(key) || "error_rate".equals(key)) {
      status = rounded < 99 && "availability".equals(key) ? "warn" : status;
      status = rounded >= 2 && "error_rate".equals(key) ? "critical" : status;
      if ("availability".equals(key) && rounded >= 99.5) {
        status = "ok";
      }
      if ("error_rate".equals(key) && rounded < 1) {
        status = "ok";
      }
    }
    return status;
  }

  private double round(double value) {
    return Math.round(value * 100.0) / 100.0;
  }
}
