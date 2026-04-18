package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.AuditLogDao;
import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final AuditLogDao auditLogDao;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(AuditLogDO auditLog) {
        auditLogDao.save(auditLog);
    }

    @Override
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLogAsync(AuditLogDO auditLog) {
        try {
            auditLogDao.save(auditLog);
            log.debug("Async audit log saved: userId={}, module={}, action={}",
                    auditLog.getUserId(), auditLog.getModule(), auditLog.getAction());
        } catch (Exception e) {
            log.error("Failed to save audit log asynchronously", e);
        }
    }

    @Override
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLogsAsync(List<AuditLogDO> auditLogs) {
        try {
            auditLogDao.saveAll(auditLogs);
            log.debug("Async audit logs saved: count={}", auditLogs.size());
        } catch (Exception e) {
            log.error("Failed to save audit logs asynchronously", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AuditLogDO> queryAuditLogs(
            Long userId,
            AuditModule module,
            AuditAction action,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Pageable pageable
    ) {
        Page<AuditLogDO> page = auditLogDao.searchAuditLogs(
                userId, module, action, startTime, endTime, pageable
        );

        return PageResponseDTO.of(
                page.getContent(),
                page.getTotalElements(),
                page.getNumber(),
                page.getSize()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AuditLogDO> queryAuditLogs(
            Long userId,
            AuditModule module,
            AuditAction action,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int page,
            int size
    ) {
        return queryAuditLogs(userId, module, action, startTime, endTime,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @Override
    @Transactional(readOnly = true)
    public AuditLogDO getAuditLogById(Long id) {
        return auditLogDao.findById(id)
                .orElseThrow(() -> new NotFoundException("Audit log not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public long countByUserAndModuleAndAction(
            Long userId,
            AuditModule module,
            AuditAction action
    ) {
        return auditLogDao.countByUserAndModuleAndAction(userId, module, action);
    }
}
