package cn.edu.cqut.advisorplatform.service.impl.monitor;

import cn.edu.cqut.advisorplatform.dto.response.monitor.MonitorPointDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
class PrometheusResponseParser {

  private final ObjectMapper objectMapper;

  double instantValue(String body) throws IOException {
    JsonNode root = objectMapper.readTree(body);
    JsonNode result = root.path("data").path("result");
    if (!result.isArray() || result.isEmpty()) {
      return 0D;
    }
    double sum = 0D;
    for (JsonNode item : result) {
      JsonNode value = item.path("value");
      if (value.isArray() && value.size() >= 2) {
        sum += parseDouble(value.get(1).asText("0"));
      }
    }
    return sum;
  }

  List<MonitorPointDTO> rangePoints(String body) throws IOException {
    List<MonitorPointDTO> points = new ArrayList<>();
    JsonNode root = objectMapper.readTree(body);
    JsonNode result = root.path("data").path("result");
    if (!result.isArray() || result.isEmpty()) {
      return points;
    }
    JsonNode values = result.get(0).path("values");
    if (!values.isArray()) {
      return points;
    }
    for (JsonNode item : values) {
      if (item.isArray() && item.size() >= 2) {
        long timestamp = item.get(0).asLong() * 1000L;
        double value = parseDouble(item.get(1).asText("0"));
        points.add(new MonitorPointDTO(timestamp, round(value)));
      }
    }
    return points;
  }

  private double parseDouble(String value) {
    try {
      return Double.parseDouble(value);
    } catch (Exception e) {
      return 0D;
    }
  }

  private double round(double value) {
    return Math.round(value * 100.0) / 100.0;
  }
}
