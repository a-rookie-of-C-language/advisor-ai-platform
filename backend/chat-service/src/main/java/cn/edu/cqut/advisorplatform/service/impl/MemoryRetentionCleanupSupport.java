package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
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
class MemoryRetentionCleanupSupport {

  private static final BigDecimal LOW_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.3);
  private static final int LOW_CONFIDENCE_BATCH_SIZE = 200;

  private final UserMemoryDao userMemoryDao;

  Map<String, Integer> cleanupExpiredMemories() {
    int softDeleted = deleteSoftDeletedBefore(LocalDateTime.now().minusDays(30));
    int lowConfidence = deleteLowConfidenceStale(LocalDateTime.now().minusDays(90));

    log.info("memory_cleanup_done soft_deleted={}, low_confidence={}", softDeleted, lowConfidence);
    return Map.of("soft_deleted", softDeleted, "low_confidence", lowConfidence);
  }

  private int deleteSoftDeletedBefore(LocalDateTime cutoff) {
    List<UserMemoryDO> rows = userMemoryDao.findSoftDeletedBefore(cutoff);
    return deleteRows(rows);
  }

  private int deleteLowConfidenceStale(LocalDateTime staleCutoff) {
    List<UserMemoryDO> rows =
        userMemoryDao.findLowConfidenceStale(
            LOW_CONFIDENCE_THRESHOLD, staleCutoff, PageRequest.of(0, LOW_CONFIDENCE_BATCH_SIZE));
    return deleteRows(rows);
  }

  private int deleteRows(List<UserMemoryDO> rows) {
    if (rows.isEmpty()) {
      return 0;
    }
    List<Long> ids = rows.stream().map(UserMemoryDO::getId).toList();
    userMemoryDao.deleteAllByIdInBatch(ids);
    return ids.size();
  }
}
