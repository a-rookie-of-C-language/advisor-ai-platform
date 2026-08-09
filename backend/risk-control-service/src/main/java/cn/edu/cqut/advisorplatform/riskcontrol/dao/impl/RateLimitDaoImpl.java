package cn.edu.cqut.advisorplatform.riskcontrol.dao.impl;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.RateLimitDao;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RateLimitDaoImpl implements RateLimitDao {

  private final StringRedisTemplate redisTemplate;

  @Override
  public long incrementAndExpireOnFirstHit(String key, Duration ttl) {
    Long count = redisTemplate.opsForValue().increment(key);
    long safeCount = count == null ? 0L : count;
    if (safeCount == 1L) {
      redisTemplate.expire(key, ttl);
    }
    return safeCount;
  }
}
