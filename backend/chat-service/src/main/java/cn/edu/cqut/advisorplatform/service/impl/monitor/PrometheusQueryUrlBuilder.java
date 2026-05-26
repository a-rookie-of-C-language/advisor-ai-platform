package cn.edu.cqut.advisorplatform.service.impl.monitor;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

class PrometheusQueryUrlBuilder {

  private final String prometheusBaseUrl;

  PrometheusQueryUrlBuilder(String prometheusBaseUrl) {
    this.prometheusBaseUrl =
        prometheusBaseUrl.endsWith("/")
            ? prometheusBaseUrl.substring(0, prometheusBaseUrl.length() - 1)
            : prometheusBaseUrl;
  }

  String instantUrl(String query) {
    return prometheusBaseUrl + "/api/v1/query?query=" + encode(query);
  }

  String rangeUrl(String query, long start, long end, int stepSeconds) {
    return prometheusBaseUrl
        + "/api/v1/query_range?query="
        + encode(query)
        + "&start="
        + start
        + "&end="
        + end
        + "&step="
        + stepSeconds;
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
