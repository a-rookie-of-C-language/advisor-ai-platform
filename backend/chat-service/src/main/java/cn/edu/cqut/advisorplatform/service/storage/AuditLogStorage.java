package cn.edu.cqut.advisorplatform.service.storage;

import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogStorage {

    String storeType();

    void save(AuditLogDO auditLog);

    void saveAsync(AuditLogDO auditLog);

    void saveBatch(List<AuditLogDO> auditLogs);

    PageResponseDTO<AuditLogDO> search(
            Long userId,
            AuditModule module,
            AuditAction action,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Pageable pageable
    );

    AuditLogDO findById(Long id);

    long countByUserAndModule(Long userId, AuditModule module);

    long countByUserAndModuleAndAction(Long userId, AuditModule module, AuditAction action);
}