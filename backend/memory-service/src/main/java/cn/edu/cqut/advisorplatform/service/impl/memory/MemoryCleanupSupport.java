package cn.edu.cqut.advisorplatform.service.impl.memory;

import cn.edu.cqut.advisorplatform.memoryservice.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class MemoryCleanupSupport {

  private static final BigDecimal LOW_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.3);
  private static final int LOW_CONFIDENCE_BATCH_SIZE = 200;

  private final UserMemoryDao userMemoryDao;

  Map<String, Integer> cleanupExpiredMemories() {
    int softDeleted = 0;
    int lowConfidence = 0;

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime softDeleteCutoff = now.minusDays(30);
    LocalDateTime staleCutoff = now.minusDays(90);

    List<UserMemoryDO> softDeletedRows = userMemoryDao.findSoftDeletedBefore(softDeleteCutoff);
    if (!softDeletedRows.isEmpty()) {
      List<Long> ids = softDeletedRows.stream().map(UserMemoryDO::getId).toList();
      userMemoryDao.deleteAllByIdInBatch(ids);
      softDeleted = ids.size();
    }

    List<UserMemoryDO> staleRows =
        userMemoryDao.findLowConfidenceStale(
            LOW_CONFIDENCE_THRESHOLD, staleCutoff, PageRequest.of(0, LOW_CONFIDENCE_BATCH_SIZE));
    if (!staleRows.isEmpty()) {
      List<Long> ids = staleRows.stream().map(UserMemoryDO::getId).toList();
      userMemoryDao.deleteAllByIdInBatch(ids);
      lowConfidence = ids.size();
    }

    log.info("memory_cleanup_done soft_deleted={}, low_confidence={}", softDeleted, lowConfidence);

    return Map.of("soft_deleted", softDeleted, "low_confidence", lowConfidence);
  }
}
