package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserMemoryDao extends JpaRepository<UserMemoryDO, Long> {

    @Query("""
            SELECT m FROM UserMemoryDO m
            WHERE m.userId = :userId
              AND (:kbId = 0 OR m.kbId = :kbId)
              AND m.isDeleted = false
              AND (m.expiresAt IS NULL OR m.expiresAt > :now)
              AND (:query = '' OR LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY m.updatedAt DESC
            """)
    List<UserMemoryDO> searchByScope(
            @Param("userId") Long userId,
            @Param("kbId") Long kbId,
            @Param("query") String query,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @Query(
            value = """
                    SELECT *
                    FROM user_memory
                    WHERE user_id = :userId
                      AND (:kbId = 0 OR kb_id = :kbId)
                      AND is_deleted = false
                      AND embedding IS NOT NULL
                      AND (embedding <=> CAST(:embedding AS vector)) <= :maxDistance
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<UserMemoryDO> findMostSimilarByVector(
            @Param("userId") Long userId,
            @Param("kbId") Long kbId,
            @Param("embedding") String embedding,
            @Param("maxDistance") Double maxDistance
    );

    @Query(
            value = """
                    SELECT *
                    FROM user_memory
                    WHERE user_id = :userId
                      AND (:kbId = 0 OR kb_id = :kbId)
                      AND is_deleted = false
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT :topK
                    """,
            nativeQuery = true
    )
    List<UserMemoryDO> searchByVector(
            @Param("userId") Long userId,
            @Param("kbId") Long kbId,
            @Param("embedding") String embedding,
            @Param("topK") Integer topK
    );

    @Modifying
    @Query(
            value = """
                    UPDATE user_memory
                    SET embedding = CAST(:embedding AS vector),
                        updated_at = NOW()
                    WHERE id = :id
                    """,
            nativeQuery = true
    )
    int updateEmbeddingById(
            @Param("id") Long id,
            @Param("embedding") String embedding
    );

    @Query("""
            SELECT COUNT(m) FROM UserMemoryDO m
            WHERE m.userId = :userId
              AND m.kbId = :kbId
              AND m.isDeleted = false
              AND (m.expiresAt IS NULL OR m.expiresAt > :now)
            """)
    long countActiveByUserAndKb(
            @Param("userId") Long userId,
            @Param("kbId") Long kbId,
            @Param("now") LocalDateTime now
    );

    @Query("""
            SELECT m FROM UserMemoryDO m
            WHERE m.isDeleted = true AND m.updatedAt < :cutoff
            """)
    List<UserMemoryDO> findSoftDeletedBefore(@Param("cutoff") LocalDateTime cutoff);

    @Query("""
            SELECT m FROM UserMemoryDO m
            WHERE m.isDeleted = false
              AND m.confidence < :maxConfidence
              AND m.updatedAt < :staleSince
            ORDER BY m.accessCount ASC, m.updatedAt ASC
            """)
    List<UserMemoryDO> findLowConfidenceStale(
            @Param("maxConfidence") java.math.BigDecimal maxConfidence,
            @Param("staleSince") LocalDateTime staleSince,
            Pageable pageable
    );

    @Modifying
    @Query(
            value = """
                    UPDATE user_memory
                    SET access_count = access_count + 1,
                        last_accessed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = :id
                    """,
            nativeQuery = true
    )
    int incrementAccessCount(@Param("id") Long id);

    void deleteAllByIdInBatch(Iterable<Long> ids);
}
