package cn.edu.cqut.advisorplatform.riskcontrol.dao;

import java.time.Duration;

public interface RateLimitDao {

  long incrementAndExpireOnFirstHit(String key, Duration ttl);
}
