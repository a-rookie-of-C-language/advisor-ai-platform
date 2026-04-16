package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserMemoryDao extends JpaRepository<UserMemoryDO, Long> {

    @Query("""
            SELECT m FROM UserMemoryDO m
            WHERE m.userId = :userId
              AND m.kbId = :kbId
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
}
