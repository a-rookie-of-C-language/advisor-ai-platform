package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogDao extends JpaRepository<AuditLogDO, Long> {

    Page<AuditLogDO> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<AuditLogDO> findByModuleOrderByCreatedAtDesc(AuditLogDO.AuditModule module, Pageable pageable);

    Page<AuditLogDO> findByActionOrderByCreatedAtDesc(AuditLogDO.AuditAction action, Pageable pageable);

    @Query("SELECT a FROM AuditLogDO a WHERE a.createdAt BETWEEN :startTime AND :endTime ORDER BY a.createdAt DESC")
    Page<AuditLogDO> findByDateRange(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable
    );

    @Query("SELECT a FROM AuditLogDO a WHERE " +
            "(:userId IS NULL OR a.userId = :userId) AND " +
            "(:module IS NULL OR a.module = :module) AND " +
            "(:action IS NULL OR a.action = :action) AND " +
            "(:startTime IS NULL OR a.createdAt >= :startTime) AND " +
            "(:endTime IS NULL OR a.createdAt <= :endTime) " +
            "ORDER BY a.createdAt DESC")
    Page<AuditLogDO> searchAuditLogs(
            @Param("userId") Long userId,
            @Param("module") AuditLogDO.AuditModule module,
            @Param("action") AuditLogDO.AuditAction action,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable
    );

    List<AuditLogDO> findTop100ByOrderByCreatedAtDesc();

    @Query("SELECT COUNT(a) FROM AuditLogDO a WHERE a.userId = :userId AND a.module = :module")
    long countByUserAndModule(
            @Param("userId") Long userId,
            @Param("module") AuditLogDO.AuditModule module
    );

    @Query("SELECT COUNT(a) FROM AuditLogDO a WHERE a.userId = :userId AND a.module = :module AND a.action = :action")
    long countByUserAndModuleAndAction(
            @Param("userId") Long userId,
            @Param("module") AuditLogDO.AuditModule module,
            @Param("action") AuditLogDO.AuditAction action
    );
}
