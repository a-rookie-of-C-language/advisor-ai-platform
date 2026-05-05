package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitFilter implements RiskFilter {

  private final StringRedisTemplate redisTemplate;

  @Value("${advisor.risk.rate-limit.requests-per-minute:10}")
  private int requestsPerMinute;

  @Override
  public String getName() {
    return "rate-limit";
  }

  @Override
  public RiskCheckResponse check(RiskCheckRequest request) {
    if (request.getUserId() == null) {
      return passed();
    }

    String key = "rate_limit:" + request.getUserId();
    String countStr = redisTemplate.opsForValue().get(key);
    int count = countStr != null ? Integer.parseInt(countStr) : 0;

    if (count >= requestsPerMinute) {
      log.warn("Rate limit exceeded: userId={}, count={}", request.getUserId(), count);
      return RiskCheckResponse.builder()
          .passed(false)
          .action("reject")
          .reason("请求频率超限")
          .category("rate_limit")
          .statusCode(429)
          .message("请求过于频繁，请稍后再试")
          .build();
    }

    redisTemplate.opsForValue().increment(key);
    redisTemplate.expire(key, Duration.ofMinutes(1));
    return passed();
  }

  private RiskCheckResponse passed() {
    return RiskCheckResponse.builder().passed(true).build();
  }
}
