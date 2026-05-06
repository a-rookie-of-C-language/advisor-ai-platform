package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.service.MemoryService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(
    name = "advisor.memory.cleanup.enabled",
    havingValue = "true",
    matchIfMissing = true)
public class MemoryCleanupService {

  private final MemoryService memoryService;

  @Scheduled(cron = "${advisor.memory.cleanup.cron:0 0 3 * * ?}")
  public void scheduledCleanup() {
    log.info("memory_cleanup_start");
    try {
      Map<String, Integer> result = memoryService.cleanupExpiredMemories();
      log.info(
          "memory_cleanup_complete soft_deleted={}, low_confidence={}",
          result.getOrDefault("soft_deleted", 0),
          result.getOrDefault("low_confidence", 0));
    } catch (Exception exc) {
      log.error("memory_cleanup_failed err={}", exc.getMessage(), exc);
    }
  }
}
