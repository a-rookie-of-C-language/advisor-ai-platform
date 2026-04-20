package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.MemoryTaskDO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MemoryTaskDao extends JpaRepository<MemoryTaskDO, Long> {

    Optional<MemoryTaskDO> findBySessionIdAndTurnId(@Param("sessionId") Long sessionId, @Param("turnId") String turnId);

    @Query("""
            SELECT t FROM MemoryTaskDO t
            WHERE t.status = 'pending'
              AND (t.retryCount < :maxRetries OR t.retryCount IS NULL)
            ORDER BY t.createdAt ASC
            """)
    List<MemoryTaskDO> findPendingTasks(@Param("maxRetries") Integer maxRetries, Pageable pageable);

    @Modifying
    @Query("""
            UPDATE MemoryTaskDO t
            SET t.status = :status,
                t.processedAt = CASE
                    WHEN :status IN ('done', 'failed') THEN CURRENT_TIMESTAMP
                    ELSE t.processedAt
                END
            WHERE t.id = :id
            """)
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    @Modifying
    @Query("""
            UPDATE MemoryTaskDO t
            SET t.status = 'failed',
                t.retryCount = COALESCE(t.retryCount, 0) + 1,
                t.errorMessage = :error,
                t.processedAt = :now
            WHERE t.id = :id
            """)
    int markFailed(@Param("id") Long id, @Param("error") String error, @Param("now") LocalDateTime now);
}
